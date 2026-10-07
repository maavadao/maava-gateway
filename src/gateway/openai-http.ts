import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { buildHistoryContextFromEntries, type HistoryEntry } from "../auto-reply/reply/history.ts";
import { createDefaultDeps } from "../cli/deps.ts";
import { agentCommand } from "../commands/agent.ts";
import type { ImageContent } from "../commands/agent/types.ts";
import { emitAgentEvent, onAgentEvent } from "../infra/agent-events.ts";
import { defaultRuntime } from "../runtime.ts";
import { authorizeGatewayConnect, type ResolvedGatewayAuth } from "./auth.ts";
import {
  readJsonBodyOrError,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  setSseHeaders,
  writeDone,
} from "./http-common.ts";
import { getBearerToken, resolveAgentIdForRequest, resolveSessionKey } from "./http-utils.ts";
import { applyModelOverrideToSessionEntry } from "../sessions/model-overrides.ts";
import { updateSessionStore } from "../config/sessions.ts";
import { loadSessionEntry } from "./session-utils.ts";

type OpenAiHttpOptions = {
  auth: ResolvedGatewayAuth;
  maxBodyBytes?: number;
  trustedProxies?: string[];
};

type OpenAiChatMessage = {
  role?: unknown;
  content?: unknown;
  name?: unknown;
};

type OpenAiChatCompletionRequest = {
  model?: unknown;
  stream?: unknown;
  messages?: unknown;
  user?: unknown;
};

function writeSse(res: ServerResponse, data: unknown) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function asMessages(val: unknown): OpenAiChatMessage[] {
  return Array.isArray(val) ? (val as OpenAiChatMessage[]) : [];
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part || typeof part !== "object") {
          return "";
        }
        const type = (part as { type?: unknown }).type;
        const text = (part as { text?: unknown }).text;
        const inputText = (part as { input_text?: unknown }).input_text;
        if (type === "text" && typeof text === "string") {
          return text;
        }
        if (type === "input_text" && typeof text === "string") {
          return text;
        }
        if (typeof inputText === "string") {
          return inputText;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

/**
 * Extract image_url parts from a message content array into ImageContent[].
 * Handles data-URLs (base64).
 */
function extractImageParts(content: unknown): ImageContent[] {
  if (!Array.isArray(content)) {
    console.log(`[IMG-DEBUG][gateway][extractImageParts] content is not array: type=${typeof content}`);
    return [];
  }
  console.log(`[IMG-DEBUG][gateway][extractImageParts] content array length=${content.length}`);
  const images: ImageContent[] = [];
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    const type = (part as { type?: unknown }).type;
    if (type !== "image_url") {
      console.log(`[IMG-DEBUG][gateway][extractImageParts]   skipping part type=${String(type)}`);
      continue;
    }
    const imageUrl = (part as { image_url?: { url?: unknown } }).image_url;
    const url = typeof imageUrl?.url === "string" ? imageUrl.url : "";
    if (!url) {
      console.log(`[IMG-DEBUG][gateway][extractImageParts]   image_url part has empty url`);
      continue;
    }

    console.log(`[IMG-DEBUG][gateway][extractImageParts]   image_url part found: urlLen=${url.length} urlStart=${url.substring(0, 50)}`);

    if (url.startsWith("data:")) {
      const match = url.match(/^data:([\w/+.-]+);base64,(.+)$/);
      if (match) {
        console.log(`[IMG-DEBUG][gateway][extractImageParts]   => decoded data URL: mimeType=${match[1]} base64Len=${match[2].length}`);
        images.push({ type: "image", data: match[2], mimeType: match[1] });
      } else {
        console.log(`[IMG-DEBUG][gateway][extractImageParts]   => data URL regex did NOT match`);
      }
    }
  }
  console.log(`[IMG-DEBUG][gateway][extractImageParts] => total images extracted: ${images.length}`);
  return images;
}

function buildAgentPrompt(messagesUnknown: unknown): {
  message: string;
  extraSystemPrompt?: string;
  images?: ImageContent[];
} {
  const messages = asMessages(messagesUnknown);

  const systemParts: string[] = [];
  const conversationEntries: Array<{ role: "user" | "assistant" | "tool"; entry: HistoryEntry }> =
    [];
  let lastUserImages: ImageContent[] = [];

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") {
      continue;
    }
    const role = typeof msg.role === "string" ? msg.role.trim() : "";
    const content = extractTextContent(msg.content).trim();
    const images = extractImageParts(msg.content);

    if (!role) {
      continue;
    }
    if (role === "system" || role === "developer") {
      if (content) systemParts.push(content);
      continue;
    }

    if (!content && images.length === 0) {
      continue;
    }

    const normalizedRole = role === "function" ? "tool" : role;
    if (normalizedRole !== "user" && normalizedRole !== "assistant" && normalizedRole !== "tool") {
      continue;
    }

    if (normalizedRole === "user" && images.length > 0) {
      lastUserImages = images;
    }

    const name = typeof msg.name === "string" ? msg.name.trim() : "";
    const sender =
      normalizedRole === "assistant"
        ? "Assistant"
        : normalizedRole === "user"
          ? "User"
          : name
            ? `Tool:${name}`
            : "Tool";

    const bodyText = content || (images.length > 0 ? "[User sent image(s)]" : "");

    conversationEntries.push({
      role: normalizedRole,
      entry: { sender, body: bodyText },
    });
  }

  let message = "";
  if (conversationEntries.length > 0) {
    let currentIndex = -1;
    for (let i = conversationEntries.length - 1; i >= 0; i -= 1) {
      const entryRole = conversationEntries[i]?.role;
      if (entryRole === "user" || entryRole === "tool") {
        currentIndex = i;
        break;
      }
    }
    if (currentIndex < 0) {
      currentIndex = conversationEntries.length - 1;
    }
    const currentEntry = conversationEntries[currentIndex]?.entry;
    if (currentEntry) {
      const historyEntries = conversationEntries.slice(0, currentIndex).map((entry) => entry.entry);
      if (historyEntries.length === 0) {
        message = currentEntry.body;
      } else {
        const formatEntry = (entry: HistoryEntry) => `${entry.sender}: ${entry.body}`;
        message = buildHistoryContextFromEntries({
          entries: [...historyEntries, currentEntry],
          currentMessage: formatEntry(currentEntry),
          formatEntry,
        });
      }
    }
  }

  return {
    message,
    extraSystemPrompt: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
    images: lastUserImages.length > 0 ? lastUserImages : undefined,
  };
}

function resolveOpenAiSessionKey(params: {
  req: IncomingMessage;
  agentId: string;
  user?: string | undefined;
}): string {
  return resolveSessionKey({ ...params, prefix: "openai" });
}

function coerceRequest(val: unknown): OpenAiChatCompletionRequest {
  if (!val || typeof val !== "object") {
    return {};
  }
  return val as OpenAiChatCompletionRequest;
}

/**
 * Parse a request model string into a provider + model pair for session override.
 * Returns null when the model string is just an agent selector (no override needed).
 *
 * OpenRouter's model format is always provider/model_name — it does NOT prepend its
 * own name to third-party models. So "google/gemma-3-4b-it:free" is an OpenRouter
 * model ID and must be forwarded to OpenRouter as-is.
 *
 * The "openrouter/" prefix is an internal convention used in openclaw.json to
 * make the routing explicit; it is stripped before sending to the API.
 *
 * Examples:
 *   "openrouter/anthropic/claude-sonnet-4-5" → { provider: "openrouter", model: "anthropic/claude-sonnet-4-5" }
 *   "google/gemma-3-4b-it:free"              → { provider: "openrouter", model: "google/gemma-3-4b-it:free" }
 *   "anthropic/claude-opus-4-5"             → { provider: "openrouter", model: "anthropic/claude-opus-4-5" }
 *   "meta-llama/llama-3.3-70b"              → { provider: "openrouter", model: "meta-llama/llama-3.3-70b" }
 *   "openclaw"                               → null  (use session default)
 *   "openclaw:main"                          → null  (agent selector)
 */
function parseModelOverrideFromRequest(
  model: string,
): { provider: string; model: string } | null {
  if (!model.includes("/")) {
    // Plain name like "openclaw" or legacy agent alias — no override
    return null;
  }
  // Already handled as an agent selector by resolveAgentIdFromModel: skip
  if (/^openclaw[:/]/i.test(model) || /^agent:/i.test(model)) {
    return null;
  }
  const slashIdx = model.indexOf("/");
  const prefix = model.slice(0, slashIdx);
  const modelName = model.slice(slashIdx + 1);
  if (!prefix || !modelName) {
    return null;
  }
  // Strip the explicit "openrouter/" prefix — the remainder is already a valid
  // OpenRouter model ID (e.g. "anthropic/claude-sonnet-4-5").
  if (prefix.toLowerCase() === "openrouter") {
    return { provider: "openrouter", model: modelName };
  }
  // All other provider/model strings are OpenRouter-format model IDs.
  // Forward the full string to OpenRouter unchanged.
  return { provider: "openrouter", model };
}

/**
 * Apply (or clear) a per-request model override on the session entry so that
 * `agentCommand` picks up the frontend-selected model rather than the openclaw.json default.
 */
async function applyRequestModelOverride(
  sessionKey: string,
  model: string,
): Promise<void> {
  const parsed = parseModelOverrideFromRequest(model);
  const { storePath, store, entry, canonicalKey } = loadSessionEntry(sessionKey);

  // Materialise a minimal entry if the session is brand new
  const sessionEntry = entry ?? { sessionId: randomUUID(), updatedAt: Date.now() };

  const selection = parsed
    ? { provider: parsed.provider, model: parsed.model }
    : { provider: "", model: "", isDefault: true as const };

  const { updated } = applyModelOverrideToSessionEntry({ entry: sessionEntry, selection });

  if (updated) {
    store[canonicalKey] = sessionEntry;
    await updateSessionStore(storePath, (s) => {
      s[canonicalKey] = sessionEntry;
    });
  }
}

export async function handleOpenAiHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: OpenAiHttpOptions,
): Promise<boolean> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host || "localhost"}`);
  if (url.pathname !== "/v1/chat/completions") {
    return false;
  }

  if (req.method !== "POST") {
    sendMethodNotAllowed(res);
    return true;
  }

  const token = getBearerToken(req);
  const authResult = await authorizeGatewayConnect({
    auth: opts.auth,
    connectAuth: { token, password: token },
    req,
    trustedProxies: opts.trustedProxies,
  });
  if (!authResult.ok) {
    sendUnauthorized(res);
    return true;
  }

  const body = await readJsonBodyOrError(req, res, opts.maxBodyBytes ?? 10 * 1024 * 1024);
  if (body === undefined) {
    return true;
  }

  const payload = coerceRequest(body);
  const stream = Boolean(payload.stream);
  const model = typeof payload.model === "string" ? payload.model : "openclaw";
  const user = typeof payload.user === "string" ? payload.user : undefined;

  // ── IMG-DEBUG: log incoming gateway request ──
  const msgArray = asMessages(payload.messages as unknown);
  console.log(`[IMG-DEBUG][gateway] incoming request: model=${model} stream=${stream} messages=${msgArray.length}`);
  msgArray.forEach((m, i) => {
    const contentType = typeof m.content;
    const isArray = Array.isArray(m.content);
    console.log(`[IMG-DEBUG][gateway]   msg[${i}] role=${String(m.role)} contentType=${contentType} isArray=${isArray}${isArray ? ` arrayLen=${(m.content as unknown[]).length}` : ''}`);
    if (isArray) {
      (m.content as Array<{type?: string; text?: string; image_url?: {url?: string}}>).forEach((p, j) => {
        if (p.type === 'image_url') {
          console.log(`[IMG-DEBUG][gateway]     part[${j}] type=image_url urlLen=${p.image_url?.url?.length} urlStart=${p.image_url?.url?.substring(0, 50)}`);
        } else {
          console.log(`[IMG-DEBUG][gateway]     part[${j}] type=${p.type} textLen=${p.text?.length ?? 'N/A'}`);
        }
      });
    }
  });

  const agentId = resolveAgentIdForRequest({ req, model });
  const sessionKey = resolveOpenAiSessionKey({ req, agentId, user });
  const prompt = buildAgentPrompt(payload.messages);
  console.log(`[IMG-DEBUG][gateway] buildAgentPrompt result: messageLen=${prompt.message.length} hasExtraSystem=${!!prompt.extraSystemPrompt} imageCount=${prompt.images?.length ?? 0}`);
  if (prompt.images && prompt.images.length > 0) {
    prompt.images.forEach((img, i) => {
      console.log(`[IMG-DEBUG][gateway]   image[${i}] type=${img.type} mimeType=${img.mimeType} dataLen=${img.data?.length ?? 0}`);
    });
  }
  if (!prompt.message) {
    sendJson(res, 400, {
      error: {
        message: "Missing user message in `messages`.",
        type: "invalid_request_error",
      },
    });
    return true;
  }

  // Apply the frontend-selected model as a session override so agentCommand
  // uses it instead of the openclaw.json default.
  await applyRequestModelOverride(sessionKey, model);

  const runId = `chatcmpl_${randomUUID()}`;
  const deps = createDefaultDeps();

  if (!stream) {
    try {
      console.log(`[IMG-DEBUG][gateway] agentCommand (non-stream): images=${prompt.images?.length ?? 0} messageLen=${prompt.message.length}`);
      const result = await agentCommand(
        {
          message: prompt.message,
          extraSystemPrompt: prompt.extraSystemPrompt,
          images: prompt.images,
          sessionKey,
          runId,
          deliver: false,
          messageChannel: "webchat",
          bestEffortDeliver: false,
        },
        defaultRuntime,
        deps,
      );

      const payloads = (result as { payloads?: Array<{ text?: string }> } | null)?.payloads;
      const content =
        Array.isArray(payloads) && payloads.length > 0
          ? payloads
              .map((p) => (typeof p.text === "string" ? p.text : ""))
              .filter(Boolean)
              .join("\n\n")
          : "No response from OpenClaw.";

      sendJson(res, 200, {
        id: runId,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      });
    } catch (err) {
      sendJson(res, 500, {
        error: { message: String(err), type: "api_error" },
      });
    }
    return true;
  }

  setSseHeaders(res);

  let wroteRole = false;
  let sawAssistantDelta = false;
  let closed = false;

  const unsubscribe = onAgentEvent((evt) => {
    if (evt.runId !== runId) {
      return;
    }
    if (closed) {
      return;
    }

    if (evt.stream === "assistant") {
      const delta = evt.data?.delta;
      const text = evt.data?.text;
      const content = typeof delta === "string" ? delta : typeof text === "string" ? text : "";
      if (!content) {
        return;
      }

      if (!wroteRole) {
        wroteRole = true;
        writeSse(res, {
          id: runId,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [{ index: 0, delta: { role: "assistant" } }],
        });
      }

      sawAssistantDelta = true;
      writeSse(res, {
        id: runId,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            delta: { content },
            finish_reason: null,
          },
        ],
      });
      return;
    }

    if (evt.stream === "lifecycle") {
      const phase = evt.data?.phase;
      if (phase === "end" || phase === "error") {
        closed = true;
        unsubscribe();
        writeDone(res);
        res.end();
      }
    }
  });

  req.on("close", () => {
    closed = true;
    unsubscribe();
  });

  void (async () => {
    try {
      console.log(`[IMG-DEBUG][gateway] agentCommand (stream): images=${prompt.images?.length ?? 0} messageLen=${prompt.message.length}`);
      const result = await agentCommand(
        {
          message: prompt.message,
          extraSystemPrompt: prompt.extraSystemPrompt,
          images: prompt.images,
          sessionKey,
          runId,
          deliver: false,
          messageChannel: "webchat",
          bestEffortDeliver: false,
        },
        defaultRuntime,
        deps,
      );

      if (closed) {
        return;
      }

      if (!sawAssistantDelta) {
        if (!wroteRole) {
          wroteRole = true;
          writeSse(res, {
            id: runId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{ index: 0, delta: { role: "assistant" } }],
          });
        }

        const payloads = (result as { payloads?: Array<{ text?: string }> } | null)?.payloads;
        const content =
          Array.isArray(payloads) && payloads.length > 0
            ? payloads
                .map((p) => (typeof p.text === "string" ? p.text : ""))
                .filter(Boolean)
                .join("\n\n")
            : "No response from OpenClaw.";

        sawAssistantDelta = true;
        writeSse(res, {
          id: runId,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            {
              index: 0,
              delta: { content },
              finish_reason: null,
            },
          ],
        });
      }
    } catch (err) {
      if (closed) {
        return;
      }
      writeSse(res, {
        id: runId,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            delta: { content: `Error: ${String(err)}` },
            finish_reason: "stop",
          },
        ],
      });
      emitAgentEvent({
        runId,
        stream: "lifecycle",
        data: { phase: "error" },
      });
    } finally {
      if (!closed) {
        closed = true;
        unsubscribe();
        writeDone(res);
        res.end();
      }
    }
  })();

  return true;
}
