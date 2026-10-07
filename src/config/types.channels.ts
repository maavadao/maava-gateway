import type { GroupPolicy } from "./types.base.ts";
import type { DiscordConfig } from "./types.discord.ts";
import type { FeishuConfig } from "./types.feishu.ts";
import type { GoogleChatConfig } from "./types.googlechat.ts";
import type { IMessageConfig } from "./types.imessage.ts";
import type { MSTeamsConfig } from "./types.msteams.ts";
import type { SignalConfig } from "./types.signal.ts";
import type { SlackConfig } from "./types.slack.ts";
import type { TelegramConfig } from "./types.telegram.ts";
import type { WhatsAppConfig } from "./types.whatsapp.ts";

export type ChannelHeartbeatVisibilityConfig = {
  /** Show HEARTBEAT_OK acknowledgments in chat (default: false). */
  showOk?: boolean;
  /** Show heartbeat alerts with actual content (default: true). */
  showAlerts?: boolean;
  /** Emit indicator events for UI status display (default: true). */
  useIndicator?: boolean;
};

export type ChannelDefaultsConfig = {
  groupPolicy?: GroupPolicy;
  /** Default heartbeat visibility for all channels. */
  heartbeat?: ChannelHeartbeatVisibilityConfig;
};

export type ChannelsConfig = {
  defaults?: ChannelDefaultsConfig;
  whatsapp?: WhatsAppConfig;
  telegram?: TelegramConfig;
  discord?: DiscordConfig;
  feishu?: FeishuConfig;
  googlechat?: GoogleChatConfig;
  slack?: SlackConfig;
  signal?: SignalConfig;
  imessage?: IMessageConfig;
  msteams?: MSTeamsConfig;
  [key: string]: unknown;
};
