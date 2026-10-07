import type { ChannelMessageActionName as ChannelMessageActionNameFromList } from "./message-action-names.ts";

export { CHANNEL_MESSAGE_ACTION_NAMES } from "./message-action-names.ts";

export type ChannelMessageActionName = ChannelMessageActionNameFromList;

export type {
  ChannelAuthAdapter,
  ChannelCommandAdapter,
  ChannelConfigAdapter,
  ChannelDirectoryAdapter,
  ChannelResolveKind,
  ChannelResolveResult,
  ChannelResolverAdapter,
  ChannelElevatedAdapter,
  ChannelGatewayAdapter,
  ChannelGatewayContext,
  ChannelGroupAdapter,
  ChannelHeartbeatAdapter,
  ChannelLoginWithQrStartResult,
  ChannelLoginWithQrWaitResult,
  ChannelLogoutContext,
  ChannelLogoutResult,
  ChannelOutboundAdapter,
  ChannelOutboundContext,
  ChannelPairingAdapter,
  ChannelSecurityAdapter,
  ChannelSetupAdapter,
  ChannelStatusAdapter,
} from "./types.adapters.ts";
export type {
  ChannelAccountSnapshot,
  ChannelAccountState,
  ChannelAgentPromptAdapter,
  ChannelAgentTool,
  ChannelAgentToolFactory,
  ChannelCapabilities,
  ChannelDirectoryEntry,
  ChannelDirectoryEntryKind,
  ChannelGroupContext,
  ChannelHeartbeatDeps,
  ChannelId,
  ChannelLogSink,
  ChannelMentionAdapter,
  ChannelMessageActionAdapter,
  ChannelMessageActionContext,
  ChannelMessagingAdapter,
  ChannelMeta,
  ChannelOutboundTargetMode,
  ChannelPollContext,
  ChannelPollResult,
  ChannelSecurityContext,
  ChannelSecurityDmPolicy,
  ChannelSetupInput,
  ChannelStatusIssue,
  ChannelStreamingAdapter,
  ChannelThreadingAdapter,
  ChannelThreadingContext,
  ChannelThreadingToolContext,
  ChannelToolSend,
} from "./types.core.ts";

export type { ChannelPlugin } from "./types.plugin.ts";
