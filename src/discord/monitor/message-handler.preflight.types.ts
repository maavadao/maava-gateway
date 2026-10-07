import type { ChannelType, Client, User } from "@buape/carbon";
import type { HistoryEntry } from "../../auto-reply/reply/history.ts";
import type { ReplyToMode } from "../../config/config.ts";
import type { resolveAgentRoute } from "../../routing/resolve-route.ts";
import type { DiscordChannelConfigResolved, DiscordGuildEntryResolved } from "./allow-list.ts";
import type { DiscordChannelInfo } from "./message-utils.ts";
import type { DiscordSenderIdentity } from "./sender-identity.ts";

export type { DiscordSenderIdentity } from "./sender-identity.ts";
import type { DiscordThreadChannel } from "./threading.ts";

export type LoadedConfig = ReturnType<typeof import("../../config/config.ts").loadConfig>;
export type RuntimeEnv = import("../../runtime.ts").RuntimeEnv;

export type DiscordMessageEvent = import("./listeners.ts").DiscordMessageEvent;

export type DiscordMessagePreflightContext = {
  cfg: LoadedConfig;
  discordConfig: NonNullable<
    import("../../config/config.ts").OpenClawConfig["channels"]
  >["discord"];
  accountId: string;
  token: string;
  runtime: RuntimeEnv;
  botUserId?: string;
  guildHistories: Map<string, HistoryEntry[]>;
  historyLimit: number;
  mediaMaxBytes: number;
  textLimit: number;
  replyToMode: ReplyToMode;
  ackReactionScope: "all" | "direct" | "group-all" | "group-mentions";
  groupPolicy: "open" | "disabled" | "allowlist";

  data: DiscordMessageEvent;
  client: Client;
  message: DiscordMessageEvent["message"];
  author: User;
  sender: DiscordSenderIdentity;

  channelInfo: DiscordChannelInfo | null;
  channelName?: string;

  isGuildMessage: boolean;
  isDirectMessage: boolean;
  isGroupDm: boolean;

  commandAuthorized: boolean;
  baseText: string;
  messageText: string;
  wasMentioned: boolean;

  route: ReturnType<typeof resolveAgentRoute>;

  guildInfo: DiscordGuildEntryResolved | null;
  guildSlug: string;

  threadChannel: DiscordThreadChannel | null;
  threadParentId?: string;
  threadParentName?: string;
  threadParentType?: ChannelType;
  threadName?: string | null;

  configChannelName?: string;
  configChannelSlug: string;
  displayChannelName?: string;
  displayChannelSlug: string;

  baseSessionKey: string;
  channelConfig: DiscordChannelConfigResolved | null;
  channelAllowlistConfigured: boolean;
  channelAllowed: boolean;

  shouldRequireMention: boolean;
  hasAnyMention: boolean;
  allowTextCommands: boolean;
  shouldBypassMention: boolean;
  effectiveWasMentioned: boolean;
  canDetectMention: boolean;

  historyEntry?: HistoryEntry;
};

export type DiscordMessagePreflightParams = {
  cfg: LoadedConfig;
  discordConfig: DiscordMessagePreflightContext["discordConfig"];
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
  ackReactionScope: DiscordMessagePreflightContext["ackReactionScope"];
  groupPolicy: DiscordMessagePreflightContext["groupPolicy"];
  data: DiscordMessageEvent;
  client: Client;
};
