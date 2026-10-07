import {
  createAgentSession,
  estimateTokens,
  SessionManager,
  SettingsManager,
} from "@mariozechner/pi-coding-agent";
import fs from "node:fs/promises";
import os from "node:os";
import type { ReasoningLevel, ThinkLevel } from "../../auto-reply/thinking.ts";
import type { OpenClawConfig } from "../../config/config.ts";
import type { ExecElevatedDefaults } from "../bash-tools.ts";
import type { EmbeddedPiCompactResult } from "./types.ts";
import { resolveHeartbeatPrompt } from "../../auto-reply/heartbeat.ts";
import { resolveChannelCapabilities } from "../../config/channel-capabilities.ts";
import { getMachineDisplayName } from "../../infra/machine-name.ts";
import { type enqueueCommand, enqueueCommandInLane } from "../../process/command-queue.ts";
import { isSubagentSessionKey } from "../../routing/session-key.ts";
import { resolveSignalReactionLevel } from "../../signal/reaction-level.ts";
import { resolveTelegramInlineButtonsScope } from "../../telegram/inline-buttons.ts";
import { resolveTelegramReactionLevel } from "../../telegram/reaction-level.ts";
import { buildTtsSystemPromptHint } from "../../tts/tts.ts";
import { resolveUserPath } from "../../utils.ts";
import { normalizeMessageChannel } from "../../utils/message-channel.ts";
import { isReasoningTagProvider } from "../../utils/provider-utils.ts";
import { resolveOpenClawAgentDir } from "../agent-paths.ts";
import { resolveSessionAgentIds } from "../agent-scope.ts";
import { makeBootstrapWarn, resolveBootstrapContextForRun } from "../bootstrap-files.ts";
import { listChannelSupportedActions, resolveChannelMessageToolHints } from "../channel-tools.ts";
import { formatUserTime, resolveUserTimeFormat, resolveUserTimezone } from "../date-time.ts";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "../defaults.ts";
import { resolveOpenClawDocsPath } from "../docs-path.ts";
import { getApiKeyForModel, resolveModelAuthMode } from "../model-auth.ts";
import { ensureOpenClawModelsJson } from "../models-config.ts";
import {
  ensureSessionHeader,
  validateAnthropicTurns,
  validateGeminiTurns,
} from "../pi-embedded-helpers.ts";
import {
  ensurePiCompactionReserveTokens,
  resolveCompactionReserveTokensFloor,
} from "../pi-settings.ts";
import { createOpenClawCodingTools } from "../pi-tools.ts";
import { resolveSandboxContext } from "../sandbox.ts";
import { repairSessionFileIfNeeded } from "../session-file-repair.ts";
import { guardSessionManager } from "../session-tool-result-guard-wrapper.ts";
import { acquireSessionWriteLock } from "../session-write-lock.ts";
import {
  applySkillEnvOverrides,
  applySkillEnvOverridesFromSnapshot,
  loadWorkspaceSkillEntries,
  resolveSkillsPromptForRun,
  type SkillSnapshot,
} from "../skills.ts";
import { resolveTranscriptPolicy } from "../transcript-policy.ts";
import { buildEmbeddedExtensionPaths } from "./extensions.ts";
import {
  logToolSchemasForGoogle,
  sanitizeSessionHistory,
  sanitizeToolsForGoogle,
} from "./google.ts";
import { getDmHistoryLimitFromSessionKey, limitHistoryTurns } from "./history.ts";
import { resolveGlobalLane, resolveSessionLane } from "./lanes.ts";
import { log } from "./logger.ts";
import { buildModelAliasLines, resolveModel } from "./model.ts";
import { buildEmbeddedSandboxInfo } from "./sandbox-info.ts";
import { prewarmSessionFile, trackSessionManagerAccess } from "./session-manager-cache.ts";
import {
  applySystemPromptOverrideToSession,
  buildEmbeddedSystemPrompt,
  createSystemPromptOverride,
} from "./system-prompt.ts";
import { splitSdkTools } from "./tool-split.ts";
import { describeUnknownError, mapThinkingLevel, resolveExecToolDefaults } from "./utils.ts";

export type CompactEmbeddedPiSessionParams = {
  sessionId: string;
  sessionKey?: string;
  messageChannel?: string;
  messageProvider?: string;
  agentAccountId?: string;
  authProfileId?: string;
  /** Group id for channel-level tool policy resolution. */
  groupId?: string | null;
  /** Group channel label (e.g. #general) for channel-level tool policy resolution. */
  groupChannel?: string | null;
  /** Group space label (e.g. guild/team id) for channel-level tool policy resolution. */
  groupSpace?: string | null;
  /** Parent session key for subagent policy inheritance. */
  spawnedBy?: string | null;
  sessionFile: string;
  workspaceDir: string;
  agentDir?: string;
  config?: OpenClawConfig;
  skillsSnapshot?: SkillSnapshot;
  provider?: string;
  model?: string;
  thinkLevel?: ThinkLevel;
  reasoningLevel?: ReasoningLevel;
  bashElevated?: ExecElevatedDefaults;
  customInstructions?: string;
  lane?: string;
  enqueue?: typeof enqueueCommand;
  extraSystemPrompt?: string;
  ownerNumbers?: string[];
};

/**
 * Core compaction logic without lane queueing.
 * Use this when already inside a session/global lane to avoid deadlocks.
 */
export async function compactEmbeddedPiSessionDirect(
  params: CompactEmbeddedPiSessionParams,
): Promise<EmbeddedPiCompactResult> {
  const resolvedWorkspace = resolveUserPath(params.workspaceDir);
  const prevCwd = process.cwd();

  const provider = (params.provider ?? DEFAULT_PROVIDER).trim() || DEFAULT_PROVIDER;
  const modelId = (params.model ?? DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const agentDir = params.agentDir ?? resolveOpenClawAgentDir();
  await ensureOpenClawModelsJson(params.config, agentDir);
  const { model, error, authStorage, modelRegistry } = resolveModel(
    provider,
    modelId,
    agentDir,
    params.config,
  );
  if (!model) {
    return {
      ok: false,
      compacted: false,
      reason: error ?? `Unknown model: ${provider}/${modelId}`,
    };
  }
  try {
    const apiKeyInfo = await getApiKeyForModel({
      model,
      cfg: params.config,
      profileId: params.authProfileId,
      agentDir,
    });

    if (!apiKeyInfo.apiKey) {
      if (apiKeyInfo.mode !== "aws-sdk") {
        throw new Error(
          `No API key resolved for provider "${model.provider}" (auth mode: ${apiKeyInfo.mode}).`,
        );
      }
    } else if (model.provider === "github-copilot") {
      const { resolveCopilotApiToken } = await import("../../providers/github-copilot-token.ts");
      const copilotToken = await resolveCopilotApiToken({
        githubToken: apiKeyInfo.apiKey,
      });
      authStorage.setRuntimeApiKey(model.provider, copilotToken.token);
    } else {
      authStorage.setRuntimeApiKey(model.provider, apiKeyInfo.apiKey);
    }
  } catch (err) {
    return {
      ok: false,
      compacted: false,
      reason: describeUnknownError(err),
    };
  }

  await fs.mkdir(resolvedWorkspace, { recursive: true });
  const sandboxSessionKey = params.sessionKey?.trim() || params.sessionId;
  const sandbox = await resolveSandboxContext({
    config: params.config,
    sessionKey: sandboxSessionKey,
    workspaceDir: resolvedWorkspace,
  });
  const effectiveWorkspace = sandbox?.enabled
    ? sandbox.workspaceAccess === "rw"
      ? resolvedWorkspace
      : sandbox.workspaceDir
    : resolvedWorkspace;
  await fs.mkdir(effectiveWorkspace, { recursive: true });
  await ensureSessionHeader({
    sessionFile: params.sessionFile,
    sessionId: params.sessionId,
    cwd: effectiveWorkspace,
  });

  let restoreSkillEnv: (() => void) | undefined;
  process.chdir(effectiveWorkspace);
  try {
    const shouldLoadSkillEntries = !params.skillsSnapshot || !params.skillsSnapshot.resolvedSkills;
    const skillEntries = shouldLoadSkillEntries
      ? loadWorkspaceSkillEntries(effectiveWorkspace)
      : [];
    restoreSkillEnv = params.skillsSnapshot
      ? applySkillEnvOverridesFromSnapshot({
          snapshot: params.skillsSnapshot,
          config: params.config,
        })
      : applySkillEnvOverrides({
          skills: skillEntries ?? [],
          config: params.config,
        });
    const skillsPrompt = resolveSkillsPromptForRun({
      skillsSnapshot: params.skillsSnapshot,
      entries: shouldLoadSkillEntries ? skillEntries : undefined,
      config: params.config,
      workspaceDir: effectiveWorkspace,
    });

    const sessionLabel = params.sessionKey ?? params.sessionId;
    const { contextFiles } = await resolveBootstrapContextForRun({
      workspaceDir: effectiveWorkspace,
      config: params.config,
      sessionKey: params.sessionKey,
      sessionId: params.sessionId,
      warn: makeBootstrapWarn({ sessionLabel, warn: (message) => log.warn(message) }),
    });
    const runAbortController = new AbortController();
    const toolsRaw = createOpenClawCodingTools({
      exec: {
        ...resolveExecToolDefaults(params.config),
        elevated: params.bashElevated,
      },
      sandbox,
      messageProvider: params.messageChannel ?? params.messageProvider,
      agentAccountId: params.agentAccountId,
      sessionKey: params.sessionKey ?? params.sessionId,
      groupId: params.groupId,
      groupChannel: params.groupChannel,
      groupSpace: params.groupSpace,
      spawnedBy: params.spawnedBy,
      agentDir,
      workspaceDir: effectiveWorkspace,
      config: params.config,
      abortSignal: runAbortController.signal,
      modelProvider: model.provider,
      modelId,
      modelAuthMode: resolveModelAuthMode(model.provider, params.config),
    });
    const tools = sanitizeToolsForGoogle({ tools: toolsRaw, provider });
    logToolSchemasForGoogle({ tools, provider });
    const machineName = await getMachineDisplayName();
    const runtimeChannel = normalizeMessageChannel(params.messageChannel ?? params.messageProvider);
    let runtimeCapabilities = runtimeChannel
      ? (resolveChannelCapabilities({
          cfg: params.config,
          channel: runtimeChannel,
          accountId: params.agentAccountId,
        }) ?? [])
      : undefined;
    if (runtimeChannel === "telegram" && params.config) {
      const inlineButtonsScope = resolveTelegramInlineButtonsScope({
        cfg: params.config,
        accountId: params.agentAccountId ?? undefined,
      });
      if (inlineButtonsScope !== "off") {
        if (!runtimeCapabilities) {
          runtimeCapabilities = [];
        }
        if (
          !runtimeCapabilities.some((cap) => String(cap).trim().toLowerCase() === "inlinebuttons")
        ) {
          runtimeCapabilities.push("inlineButtons");
        }
      }
    }
    const reactionGuidance =
      runtimeChannel && params.config
        ? (() => {
            if (runtimeChannel === "telegram") {
              const resolved = resolveTelegramReactionLevel({
                cfg: params.config,
                accountId: params.agentAccountId ?? undefined,
              });
              const level = resolved.agentReactionGuidance;
              return level ? { level, channel: "Telegram" } : undefined;
            }
            if (runtimeChannel === "signal") {
              const resolved = resolveSignalReactionLevel({
                cfg: params.config,
                accountId: params.agentAccountId ?? undefined,
              });
              const level = resolved.agentReactionGuidance;
              return level ? { level, channel: "Signal" } : undefined;
            }
            return undefined;
          })()
        : undefined;
    // Resolve channel-specific message actions for system prompt
    const channelActions = runtimeChannel
      ? listChannelSupportedActions({
          cfg: params.config,
          channel: runtimeChannel,
        })
      : undefined;
    const messageToolHints = runtimeChannel
      ? resolveChannelMessageToolHints({
          cfg: params.config,
          channel: runtimeChannel,
          accountId: params.agentAccountId,
        })
      : undefined;

    const runtimeInfo = {
      host: machineName,
      os: `${os.type()} ${os.release()}`,
      arch: os.arch(),
      node: process.version,
      model: `${provider}/${modelId}`,
      channel: runtimeChannel,
      capabilities: runtimeCapabilities,
      channelActions,
    };
    const sandboxInfo = buildEmbeddedSandboxInfo(sandbox, params.bashElevated);
    const reasoningTagHint = isReasoningTagProvider(provider);
    const userTimezone = resolveUserTimezone(params.config?.agents?.defaults?.userTimezone);
    const userTimeFormat = resolveUserTimeFormat(params.config?.agents?.defaults?.timeFormat);
    const userTime = formatUserTime(new Date(), userTimezone, userTimeFormat);
    const { defaultAgentId, sessionAgentId } = resolveSessionAgentIds({
      sessionKey: params.sessionKey,
      config: params.config,
    });
    const isDefaultAgent = sessionAgentId === defaultAgentId;
    const promptMode = isSubagentSessionKey(params.sessionKey) ? "minimal" : "full";
    const docsPath = await resolveOpenClawDocsPath({
      workspaceDir: effectiveWorkspace,
      argv1: process.argv[1],
      cwd: process.cwd(),
      moduleUrl: import.meta.url,
    });
    const ttsHint = params.config ? buildTtsSystemPromptHint(params.config) : undefined;
    const appendPrompt = buildEmbeddedSystemPrompt({
      workspaceDir: effectiveWorkspace,
      defaultThinkLevel: params.thinkLevel,
      reasoningLevel: params.reasoningLevel ?? "off",
      extraSystemPrompt: params.extraSystemPrompt,
      ownerNumbers: params.ownerNumbers,
      reasoningTagHint,
      heartbeatPrompt: isDefaultAgent
        ? resolveHeartbeatPrompt(params.config?.agents?.defaults?.heartbeat?.prompt)
        : undefined,
      skillsPrompt,
      docsPath: docsPath ?? undefined,
      ttsHint,
      promptMode,
      runtimeInfo,
      reactionGuidance,
      messageToolHints,
      sandboxInfo,
      tools,
      modelAliasLines: buildModelAliasLines(params.config),
      userTimezone,
      userTime,
      userTimeFormat,
      contextFiles,
      memoryCitationsMode: params.config?.memory?.citations,
    });
    const systemPromptOverride = createSystemPromptOverride(appendPrompt);

    const sessionLock = await acquireSessionWriteLock({
      sessionFile: params.sessionFile,
    });
    try {
      await repairSessionFileIfNeeded({
        sessionFile: params.sessionFile,
        warn: (message) => log.warn(message),
      });
      await prewarmSessionFile(params.sessionFile);
      const transcriptPolicy = resolveTranscriptPolicy({
        modelApi: model.api,
        provider,
        modelId,
      });
      const sessionManager = guardSessionManager(SessionManager.open(params.sessionFile), {
        agentId: sessionAgentId,
        sessionKey: params.sessionKey,
        allowSyntheticToolResults: transcriptPolicy.allowSyntheticToolResults,
      });
      trackSessionManagerAccess(params.sessionFile);
      const settingsManager = SettingsManager.create(effectiveWorkspace, agentDir);
      ensurePiCompactionReserveTokens({
        settingsManager,
        minReserveTokens: resolveCompactionReserveTokensFloor(params.config),
      });
      // Call for side effects (sets compaction/pruning runtime state)
      buildEmbeddedExtensionPaths({
        cfg: params.config,
        sessionManager,
        provider,
        modelId,
        model,
      });

      const { builtInTools, customTools } = splitSdkTools({
        tools,
        sandboxEnabled: !!sandbox?.enabled,
      });

      const { session } = await createAgentSession({
        cwd: resolvedWorkspace,
        agentDir,
        authStorage,
        modelRegistry,
        model,
        thinkingLevel: mapThinkingLevel(params.thinkLevel),
        tools: builtInTools,
        customTools,
        sessionManager,
        settingsManager,
      });
      applySystemPromptOverrideToSession(session, systemPromptOverride());

      try {
        const prior = await sanitizeSessionHistory({
          messages: session.messages,
          modelApi: model.api,
          modelId,
          provider,
          sessionManager,
          sessionId: params.sessionId,
          policy: transcriptPolicy,
        });
        const validatedGemini = transcriptPolicy.validateGeminiTurns
          ? validateGeminiTurns(prior)
          : prior;
        const validated = transcriptPolicy.validateAnthropicTurns
          ? validateAnthropicTurns(validatedGemini)
          : validatedGemini;
        const limited = limitHistoryTurns(
          validated,
          getDmHistoryLimitFromSessionKey(params.sessionKey, params.config),
        );
        if (limited.length > 0) {
          session.agent.replaceMessages(limited);
        }
        const result = await session.compact(params.customInstructions);
        // Estimate tokens after compaction by summing token estimates for remaining messages
        let tokensAfter: number | undefined;
        try {
          tokensAfter = 0;
          for (const message of session.messages) {
            tokensAfter += estimateTokens(message);
          }
          // Sanity check: tokensAfter should be less than tokensBefore
          if (tokensAfter > result.tokensBefore) {
            tokensAfter = undefined; // Don't trust the estimate
          }
        } catch {
          // If estimation fails, leave tokensAfter undefined
          tokensAfter = undefined;
        }
        return {
          ok: true,
          compacted: true,
          result: {
            summary: result.summary,
            firstKeptEntryId: result.firstKeptEntryId,
            tokensBefore: result.tokensBefore,
            tokensAfter,
            details: result.details,
          },
        };
      } finally {
        sessionManager.flushPendingToolResults?.();
        session.dispose();
      }
    } finally {
      await sessionLock.release();
    }
  } catch (err) {
    return {
      ok: false,
      compacted: false,
      reason: describeUnknownError(err),
    };
  } finally {
    restoreSkillEnv?.();
    process.chdir(prevCwd);
  }
}

/**
 * Compacts a session with lane queueing (session lane + global lane).
 * Use this from outside a lane context. If already inside a lane, use
 * `compactEmbeddedPiSessionDirect` to avoid deadlocks.
 */
export async function compactEmbeddedPiSession(
  params: CompactEmbeddedPiSessionParams,
): Promise<EmbeddedPiCompactResult> {
  const sessionLane = resolveSessionLane(params.sessionKey?.trim() || params.sessionId);
  const globalLane = resolveGlobalLane(params.lane);
  const enqueueGlobal =
    params.enqueue ?? ((task, opts) => enqueueCommandInLane(globalLane, task, opts));
  return enqueueCommandInLane(sessionLane, () =>
    enqueueGlobal(async () => compactEmbeddedPiSessionDirect(params)),
  );
}
