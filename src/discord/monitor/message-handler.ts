import type { Client } from "@buape/carbon";
import type { HistoryEntry } from "../../auto-reply/reply/history.ts";
import type { ReplyToMode } from "../../config/config.ts";
import type { RuntimeEnv } from "../../runtime.ts";
import type { DiscordGuildEntryResolved } from "./allow-list.ts";
import type { DiscordMessageEvent, DiscordMessageHandler } from "./listeners.ts";
import { hasControlCommand } from "../../auto-reply/command-detection.ts";
import {
  createInboundDebouncer,
  resolveInboundDebounceMs,
} from "../../auto-reply/inbound-debounce.ts";
import { danger } from "../../globals.ts";
import { preflightDiscordMessage } from "./message-handler.preflight.ts";
import { processDiscordMessage } from "./message-handler.process.ts";
import { resolveDiscordMessageText } from "./message-utils.ts";

type LoadedConfig = ReturnType<typeof import("../../config/config.ts").loadConfig>;
type DiscordConfig = NonNullable<
  import("../../config/config.ts").OpenClawConfig["channels"]
>["discord"];

export function createDiscordMessageHandler(params: {
  cfg: LoadedConfig;
  discordConfig: DiscordConfig;
  accountId: string;
  token: string;
  runtime: RuntimeEnv;
  botUserId?: string;
  guildHistories: Map<string, HistoryEntry[]>;
  historyLimit: number;
  mediaMaxBytes: number;
  textLimit: number;
  replyToMode: ReplyToMode;
  dmEnabled: boolean;
  groupDmEnabled: boolean;
  groupDmChannels?: Array<string | number>;
  allowFrom?: Array<string | number>;
  guildEntries?: Record<string, DiscordGuildEntryResolved>;
}): DiscordMessageHandler {
  const groupPolicy = params.discordConfig?.groupPolicy ?? "open";
  const ackReactionScope = params.cfg.messages?.ackReactionScope ?? "group-mentions";
  const debounceMs = resolveInboundDebounceMs({ cfg: params.cfg, channel: "discord" });

  const debouncer = createInboundDebouncer<{ data: DiscordMessageEvent; client: Client }>({
    debounceMs,
    buildKey: (entry) => {
      const message = entry.data.message;
      const authorId = entry.data.author?.id;
      if (!message || !authorId) {
        return null;
      }
      const channelId = message.channelId;
      if (!channelId) {
        return null;
      }
      return `discord:${params.accountId}:${channelId}:${authorId}`;
    },
    shouldDebounce: (entry) => {
      const message = entry.data.message;
      if (!message) {
        return false;
      }
      if (message.attachments && message.attachments.length > 0) {
        return false;
      }
      const baseText = resolveDiscordMessageText(message, { includeForwarded: false });
      if (!baseText.trim()) {
        return false;
      }
      return !hasControlCommand(baseText, params.cfg);
    },
    onFlush: async (entries) => {
      const last = entries.at(-1);
      if (!last) {
        return;
      }
      if (entries.length === 1) {
        const ctx = await preflightDiscordMessage({
          ...params,
          ackReactionScope,
          groupPolicy,
          data: last.data,
          client: last.client,
        });
        if (!ctx) {
          return;
        }
        await processDiscordMessage(ctx);
        return;
      }
      const combinedBaseText = entries
        .map((entry) => resolveDiscordMessageText(entry.data.message, { includeForwarded: false }))
        .filter(Boolean)
        .join("\n");
      const syntheticMessage = {
        ...last.data.message,
        content: combinedBaseText,
        attachments: [],
        message_snapshots: (last.data.message as { message_snapshots?: unknown }).message_snapshots,
        messageSnapshots: (last.data.message as { messageSnapshots?: unknown }).messageSnapshots,
        rawData: {
          ...(last.data.message as { rawData?: Record<string, unknown> }).rawData,
        },
      };
      const syntheticData: DiscordMessageEvent = {
        ...last.data,
        message: syntheticMessage,
      };
      const ctx = await preflightDiscordMessage({
        ...params,
        ackReactionScope,
        groupPolicy,
        data: syntheticData,
        client: last.client,
      });
      if (!ctx) {
        return;
      }
      if (entries.length > 1) {
        const ids = entries.map((entry) => entry.data.message?.id).filter(Boolean) as string[];
        if (ids.length > 0) {
          const ctxBatch = ctx as typeof ctx & {
            MessageSids?: string[];
            MessageSidFirst?: string;
            MessageSidLast?: string;
          };
          ctxBatch.MessageSids = ids;
          ctxBatch.MessageSidFirst = ids[0];
          ctxBatch.MessageSidLast = ids[ids.length - 1];
        }
      }
      await processDiscordMessage(ctx);
    },
    onError: (err) => {
      params.runtime.error?.(danger(`discord debounce flush failed: ${String(err)}`));
    },
  });

  return async (data, client) => {
    try {
      await debouncer.enqueue({ data, client });
    } catch (err) {
      params.runtime.error?.(danger(`handler failed: ${String(err)}`));
    }
  };
}
