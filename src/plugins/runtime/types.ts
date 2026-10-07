import type { LogLevel } from "../../logging/levels.ts";

type ShouldLogVerbose = typeof import("../../globals.ts").shouldLogVerbose;
type DispatchReplyWithBufferedBlockDispatcher =
  typeof import("../../auto-reply/reply/provider-dispatcher.ts").dispatchReplyWithBufferedBlockDispatcher;
type CreateReplyDispatcherWithTyping =
  typeof import("../../auto-reply/reply/reply-dispatcher.ts").createReplyDispatcherWithTyping;
type ResolveEffectiveMessagesConfig =
  typeof import("../../agents/identity.ts").resolveEffectiveMessagesConfig;
type ResolveHumanDelayConfig = typeof import("../../agents/identity.ts").resolveHumanDelayConfig;
type ResolveAgentRoute = typeof import("../../routing/resolve-route.ts").resolveAgentRoute;
type BuildPairingReply = typeof import("../../pairing/pairing-messages.ts").buildPairingReply;
type ReadChannelAllowFromStore =
  typeof import("../../pairing/pairing-store.ts").readChannelAllowFromStore;
type UpsertChannelPairingRequest =
  typeof import("../../pairing/pairing-store.ts").upsertChannelPairingRequest;
type FetchRemoteMedia = typeof import("../../media/fetch.ts").fetchRemoteMedia;
type SaveMediaBuffer = typeof import("../../media/store.ts").saveMediaBuffer;
type TextToSpeechTelephony = typeof import("../../tts/tts.ts").textToSpeechTelephony;
type BuildMentionRegexes = typeof import("../../auto-reply/reply/mentions.ts").buildMentionRegexes;
type MatchesMentionPatterns =
  typeof import("../../auto-reply/reply/mentions.ts").matchesMentionPatterns;
type MatchesMentionWithExplicit =
  typeof import("../../auto-reply/reply/mentions.ts").matchesMentionWithExplicit;
type ShouldAckReaction = typeof import("../../channels/ack-reactions.ts").shouldAckReaction;
type RemoveAckReactionAfterReply =
  typeof import("../../channels/ack-reactions.ts").removeAckReactionAfterReply;
type ResolveChannelGroupPolicy =
  typeof import("../../config/group-policy.ts").resolveChannelGroupPolicy;
type ResolveChannelGroupRequireMention =
  typeof import("../../config/group-policy.ts").resolveChannelGroupRequireMention;
type CreateInboundDebouncer =
  typeof import("../../auto-reply/inbound-debounce.ts").createInboundDebouncer;
type ResolveInboundDebounceMs =
  typeof import("../../auto-reply/inbound-debounce.ts").resolveInboundDebounceMs;
type ResolveCommandAuthorizedFromAuthorizers =
  typeof import("../../channels/command-gating.ts").resolveCommandAuthorizedFromAuthorizers;
type ResolveTextChunkLimit = typeof import("../../auto-reply/chunk.ts").resolveTextChunkLimit;
type ResolveChunkMode = typeof import("../../auto-reply/chunk.ts").resolveChunkMode;
type ChunkMarkdownText = typeof import("../../auto-reply/chunk.ts").chunkMarkdownText;
type ChunkMarkdownTextWithMode =
  typeof import("../../auto-reply/chunk.ts").chunkMarkdownTextWithMode;
type ChunkText = typeof import("../../auto-reply/chunk.ts").chunkText;
type ChunkTextWithMode = typeof import("../../auto-reply/chunk.ts").chunkTextWithMode;
type ChunkByNewline = typeof import("../../auto-reply/chunk.ts").chunkByNewline;
type ResolveMarkdownTableMode =
  typeof import("../../config/markdown-tables.ts").resolveMarkdownTableMode;
type ConvertMarkdownTables = typeof import("../../markdown/tables.ts").convertMarkdownTables;
type HasControlCommand = typeof import("../../auto-reply/command-detection.ts").hasControlCommand;
type IsControlCommandMessage =
  typeof import("../../auto-reply/command-detection.ts").isControlCommandMessage;
type ShouldComputeCommandAuthorized =
  typeof import("../../auto-reply/command-detection.ts").shouldComputeCommandAuthorized;
type ShouldHandleTextCommands =
  typeof import("../../auto-reply/commands-registry.ts").shouldHandleTextCommands;
type DispatchReplyFromConfig =
  typeof import("../../auto-reply/reply/dispatch-from-config.ts").dispatchReplyFromConfig;
type FinalizeInboundContext =
  typeof import("../../auto-reply/reply/inbound-context.ts").finalizeInboundContext;
type FormatAgentEnvelope = typeof import("../../auto-reply/envelope.ts").formatAgentEnvelope;
type FormatInboundEnvelope = typeof import("../../auto-reply/envelope.ts").formatInboundEnvelope;
type ResolveEnvelopeFormatOptions =
  typeof import("../../auto-reply/envelope.ts").resolveEnvelopeFormatOptions;
type ResolveStateDir = typeof import("../../config/paths.ts").resolveStateDir;
type RecordInboundSession = typeof import("../../channels/session.ts").recordInboundSession;
type RecordSessionMetaFromInbound =
  typeof import("../../config/sessions.ts").recordSessionMetaFromInbound;
type ResolveStorePath = typeof import("../../config/sessions.ts").resolveStorePath;
type ReadSessionUpdatedAt = typeof import("../../config/sessions.ts").readSessionUpdatedAt;
type UpdateLastRoute = typeof import("../../config/sessions.ts").updateLastRoute;
type LoadConfig = typeof import("../../config/config.ts").loadConfig;
type WriteConfigFile = typeof import("../../config/config.ts").writeConfigFile;
type RecordChannelActivity = typeof import("../../infra/channel-activity.ts").recordChannelActivity;
type GetChannelActivity = typeof import("../../infra/channel-activity.ts").getChannelActivity;
type EnqueueSystemEvent = typeof import("../../infra/system-events.ts").enqueueSystemEvent;
type RunCommandWithTimeout = typeof import("../../process/exec.ts").runCommandWithTimeout;
type FormatNativeDependencyHint = typeof import("./native-deps.ts").formatNativeDependencyHint;
type LoadWebMedia = typeof import("../../web/media.ts").loadWebMedia;
type DetectMime = typeof import("../../media/mime.ts").detectMime;
type MediaKindFromMime = typeof import("../../media/constants.ts").mediaKindFromMime;
type IsVoiceCompatibleAudio = typeof import("../../media/audio.ts").isVoiceCompatibleAudio;
type GetImageMetadata = typeof import("../../media/image-ops.ts").getImageMetadata;
type ResizeToJpeg = typeof import("../../media/image-ops.ts").resizeToJpeg;
type CreateMemoryGetTool = typeof import("../../agents/tools/memory-tool.ts").createMemoryGetTool;
type CreateMemorySearchTool =
  typeof import("../../agents/tools/memory-tool.ts").createMemorySearchTool;
type RegisterMemoryCli = typeof import("../../cli/memory-cli.ts").registerMemoryCli;
type DiscordMessageActions =
  typeof import("../../channels/plugins/actions/discord.ts").discordMessageActions;
type AuditDiscordChannelPermissions =
  typeof import("../../discord/audit.ts").auditDiscordChannelPermissions;
type ListDiscordDirectoryGroupsLive =
  typeof import("../../discord/directory-live.ts").listDiscordDirectoryGroupsLive;
type ListDiscordDirectoryPeersLive =
  typeof import("../../discord/directory-live.ts").listDiscordDirectoryPeersLive;
type ProbeDiscord = typeof import("../../discord/probe.ts").probeDiscord;
type ResolveDiscordChannelAllowlist =
  typeof import("../../discord/resolve-channels.ts").resolveDiscordChannelAllowlist;
type ResolveDiscordUserAllowlist =
  typeof import("../../discord/resolve-users.ts").resolveDiscordUserAllowlist;
type SendMessageDiscord = typeof import("../../discord/send.ts").sendMessageDiscord;
type SendPollDiscord = typeof import("../../discord/send.ts").sendPollDiscord;
type MonitorDiscordProvider = typeof import("../../discord/monitor.ts").monitorDiscordProvider;
type ListSlackDirectoryGroupsLive =
  typeof import("../../slack/directory-live.ts").listSlackDirectoryGroupsLive;
type ListSlackDirectoryPeersLive =
  typeof import("../../slack/directory-live.ts").listSlackDirectoryPeersLive;
type ProbeSlack = typeof import("../../slack/probe.ts").probeSlack;
type ResolveSlackChannelAllowlist =
  typeof import("../../slack/resolve-channels.ts").resolveSlackChannelAllowlist;
type ResolveSlackUserAllowlist =
  typeof import("../../slack/resolve-users.ts").resolveSlackUserAllowlist;
type SendMessageSlack = typeof import("../../slack/send.ts").sendMessageSlack;
type MonitorSlackProvider = typeof import("../../slack/index.ts").monitorSlackProvider;
type HandleSlackAction = typeof import("../../agents/tools/slack-actions.ts").handleSlackAction;
type AuditTelegramGroupMembership =
  typeof import("../../telegram/audit.ts").auditTelegramGroupMembership;
type CollectTelegramUnmentionedGroupIds =
  typeof import("../../telegram/audit.ts").collectTelegramUnmentionedGroupIds;
type ProbeTelegram = typeof import("../../telegram/probe.ts").probeTelegram;
type ResolveTelegramToken = typeof import("../../telegram/token.ts").resolveTelegramToken;
type SendMessageTelegram = typeof import("../../telegram/send.ts").sendMessageTelegram;
type MonitorTelegramProvider = typeof import("../../telegram/monitor.ts").monitorTelegramProvider;
type TelegramMessageActions =
  typeof import("../../channels/plugins/actions/telegram.ts").telegramMessageActions;
type ProbeSignal = typeof import("../../signal/probe.ts").probeSignal;
type SendMessageSignal = typeof import("../../signal/send.ts").sendMessageSignal;
type MonitorSignalProvider = typeof import("../../signal/index.ts").monitorSignalProvider;
type SignalMessageActions =
  typeof import("../../channels/plugins/actions/signal.ts").signalMessageActions;
type MonitorIMessageProvider = typeof import("../../imessage/monitor.ts").monitorIMessageProvider;
type ProbeIMessage = typeof import("../../imessage/probe.ts").probeIMessage;
type SendMessageIMessage = typeof import("../../imessage/send.ts").sendMessageIMessage;
type GetActiveWebListener = typeof import("../../web/active-listener.ts").getActiveWebListener;
type GetWebAuthAgeMs = typeof import("../../web/auth-store.ts").getWebAuthAgeMs;
type LogoutWeb = typeof import("../../web/auth-store.ts").logoutWeb;
type LogWebSelfId = typeof import("../../web/auth-store.ts").logWebSelfId;
type ReadWebSelfId = typeof import("../../web/auth-store.ts").readWebSelfId;
type WebAuthExists = typeof import("../../web/auth-store.ts").webAuthExists;
type SendMessageWhatsApp = typeof import("../../web/outbound.ts").sendMessageWhatsApp;
type SendPollWhatsApp = typeof import("../../web/outbound.ts").sendPollWhatsApp;
type LoginWeb = typeof import("../../web/login.ts").loginWeb;
type StartWebLoginWithQr = typeof import("../../web/login-qr.ts").startWebLoginWithQr;
type WaitForWebLogin = typeof import("../../web/login-qr.ts").waitForWebLogin;
type MonitorWebChannel = typeof import("../../channels/web/index.ts").monitorWebChannel;
type HandleWhatsAppAction =
  typeof import("../../agents/tools/whatsapp-actions.ts").handleWhatsAppAction;
type CreateWhatsAppLoginTool =
  typeof import("../../channels/plugins/agent-tools/whatsapp-login.ts").createWhatsAppLoginTool;

// LINE channel types
type ListLineAccountIds = typeof import("../../line/accounts.ts").listLineAccountIds;
type ResolveDefaultLineAccountId =
  typeof import("../../line/accounts.ts").resolveDefaultLineAccountId;
type ResolveLineAccount = typeof import("../../line/accounts.ts").resolveLineAccount;
type NormalizeLineAccountId = typeof import("../../line/accounts.ts").normalizeAccountId;
type ProbeLineBot = typeof import("../../line/probe.ts").probeLineBot;
type SendMessageLine = typeof import("../../line/send.ts").sendMessageLine;
type PushMessageLine = typeof import("../../line/send.ts").pushMessageLine;
type PushMessagesLine = typeof import("../../line/send.ts").pushMessagesLine;
type PushFlexMessage = typeof import("../../line/send.ts").pushFlexMessage;
type PushTemplateMessage = typeof import("../../line/send.ts").pushTemplateMessage;
type PushLocationMessage = typeof import("../../line/send.ts").pushLocationMessage;
type PushTextMessageWithQuickReplies =
  typeof import("../../line/send.ts").pushTextMessageWithQuickReplies;
type CreateQuickReplyItems = typeof import("../../line/send.ts").createQuickReplyItems;
type BuildTemplateMessageFromPayload =
  typeof import("../../line/template-messages.ts").buildTemplateMessageFromPayload;
type MonitorLineProvider = typeof import("../../line/monitor.ts").monitorLineProvider;

export type RuntimeLogger = {
  debug?: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export type PluginRuntime = {
  version: string;
  config: {
    loadConfig: LoadConfig;
    writeConfigFile: WriteConfigFile;
  };
  system: {
    enqueueSystemEvent: EnqueueSystemEvent;
    runCommandWithTimeout: RunCommandWithTimeout;
    formatNativeDependencyHint: FormatNativeDependencyHint;
  };
  media: {
    loadWebMedia: LoadWebMedia;
    detectMime: DetectMime;
    mediaKindFromMime: MediaKindFromMime;
    isVoiceCompatibleAudio: IsVoiceCompatibleAudio;
    getImageMetadata: GetImageMetadata;
    resizeToJpeg: ResizeToJpeg;
  };
  tts: {
    textToSpeechTelephony: TextToSpeechTelephony;
  };
  tools: {
    createMemoryGetTool: CreateMemoryGetTool;
    createMemorySearchTool: CreateMemorySearchTool;
    registerMemoryCli: RegisterMemoryCli;
  };
  channel: {
    text: {
      chunkByNewline: ChunkByNewline;
      chunkMarkdownText: ChunkMarkdownText;
      chunkMarkdownTextWithMode: ChunkMarkdownTextWithMode;
      chunkText: ChunkText;
      chunkTextWithMode: ChunkTextWithMode;
      resolveChunkMode: ResolveChunkMode;
      resolveTextChunkLimit: ResolveTextChunkLimit;
      hasControlCommand: HasControlCommand;
      resolveMarkdownTableMode: ResolveMarkdownTableMode;
      convertMarkdownTables: ConvertMarkdownTables;
    };
    reply: {
      dispatchReplyWithBufferedBlockDispatcher: DispatchReplyWithBufferedBlockDispatcher;
      createReplyDispatcherWithTyping: CreateReplyDispatcherWithTyping;
      resolveEffectiveMessagesConfig: ResolveEffectiveMessagesConfig;
      resolveHumanDelayConfig: ResolveHumanDelayConfig;
      dispatchReplyFromConfig: DispatchReplyFromConfig;
      finalizeInboundContext: FinalizeInboundContext;
      formatAgentEnvelope: FormatAgentEnvelope;
      formatInboundEnvelope: FormatInboundEnvelope;
      resolveEnvelopeFormatOptions: ResolveEnvelopeFormatOptions;
    };
    routing: {
      resolveAgentRoute: ResolveAgentRoute;
    };
    pairing: {
      buildPairingReply: BuildPairingReply;
      readAllowFromStore: ReadChannelAllowFromStore;
      upsertPairingRequest: UpsertChannelPairingRequest;
    };
    media: {
      fetchRemoteMedia: FetchRemoteMedia;
      saveMediaBuffer: SaveMediaBuffer;
    };
    activity: {
      record: RecordChannelActivity;
      get: GetChannelActivity;
    };
    session: {
      resolveStorePath: ResolveStorePath;
      readSessionUpdatedAt: ReadSessionUpdatedAt;
      recordSessionMetaFromInbound: RecordSessionMetaFromInbound;
      recordInboundSession: RecordInboundSession;
      updateLastRoute: UpdateLastRoute;
    };
    mentions: {
      buildMentionRegexes: BuildMentionRegexes;
      matchesMentionPatterns: MatchesMentionPatterns;
      matchesMentionWithExplicit: MatchesMentionWithExplicit;
    };
    reactions: {
      shouldAckReaction: ShouldAckReaction;
      removeAckReactionAfterReply: RemoveAckReactionAfterReply;
    };
    groups: {
      resolveGroupPolicy: ResolveChannelGroupPolicy;
      resolveRequireMention: ResolveChannelGroupRequireMention;
    };
    debounce: {
      createInboundDebouncer: CreateInboundDebouncer;
      resolveInboundDebounceMs: ResolveInboundDebounceMs;
    };
    commands: {
      resolveCommandAuthorizedFromAuthorizers: ResolveCommandAuthorizedFromAuthorizers;
      isControlCommandMessage: IsControlCommandMessage;
      shouldComputeCommandAuthorized: ShouldComputeCommandAuthorized;
      shouldHandleTextCommands: ShouldHandleTextCommands;
    };
    discord: {
      messageActions: DiscordMessageActions;
      auditChannelPermissions: AuditDiscordChannelPermissions;
      listDirectoryGroupsLive: ListDiscordDirectoryGroupsLive;
      listDirectoryPeersLive: ListDiscordDirectoryPeersLive;
      probeDiscord: ProbeDiscord;
      resolveChannelAllowlist: ResolveDiscordChannelAllowlist;
      resolveUserAllowlist: ResolveDiscordUserAllowlist;
      sendMessageDiscord: SendMessageDiscord;
      sendPollDiscord: SendPollDiscord;
      monitorDiscordProvider: MonitorDiscordProvider;
    };
    slack: {
      listDirectoryGroupsLive: ListSlackDirectoryGroupsLive;
      listDirectoryPeersLive: ListSlackDirectoryPeersLive;
      probeSlack: ProbeSlack;
      resolveChannelAllowlist: ResolveSlackChannelAllowlist;
      resolveUserAllowlist: ResolveSlackUserAllowlist;
      sendMessageSlack: SendMessageSlack;
      monitorSlackProvider: MonitorSlackProvider;
      handleSlackAction: HandleSlackAction;
    };
    telegram: {
      auditGroupMembership: AuditTelegramGroupMembership;
      collectUnmentionedGroupIds: CollectTelegramUnmentionedGroupIds;
      probeTelegram: ProbeTelegram;
      resolveTelegramToken: ResolveTelegramToken;
      sendMessageTelegram: SendMessageTelegram;
      monitorTelegramProvider: MonitorTelegramProvider;
      messageActions: TelegramMessageActions;
    };
    signal: {
      probeSignal: ProbeSignal;
      sendMessageSignal: SendMessageSignal;
      monitorSignalProvider: MonitorSignalProvider;
      messageActions: SignalMessageActions;
    };
    imessage: {
      monitorIMessageProvider: MonitorIMessageProvider;
      probeIMessage: ProbeIMessage;
      sendMessageIMessage: SendMessageIMessage;
    };
    whatsapp: {
      getActiveWebListener: GetActiveWebListener;
      getWebAuthAgeMs: GetWebAuthAgeMs;
      logoutWeb: LogoutWeb;
      logWebSelfId: LogWebSelfId;
      readWebSelfId: ReadWebSelfId;
      webAuthExists: WebAuthExists;
      sendMessageWhatsApp: SendMessageWhatsApp;
      sendPollWhatsApp: SendPollWhatsApp;
      loginWeb: LoginWeb;
      startWebLoginWithQr: StartWebLoginWithQr;
      waitForWebLogin: WaitForWebLogin;
      monitorWebChannel: MonitorWebChannel;
      handleWhatsAppAction: HandleWhatsAppAction;
      createLoginTool: CreateWhatsAppLoginTool;
    };
    line: {
      listLineAccountIds: ListLineAccountIds;
      resolveDefaultLineAccountId: ResolveDefaultLineAccountId;
      resolveLineAccount: ResolveLineAccount;
      normalizeAccountId: NormalizeLineAccountId;
      probeLineBot: ProbeLineBot;
      sendMessageLine: SendMessageLine;
      pushMessageLine: PushMessageLine;
      pushMessagesLine: PushMessagesLine;
      pushFlexMessage: PushFlexMessage;
      pushTemplateMessage: PushTemplateMessage;
      pushLocationMessage: PushLocationMessage;
      pushTextMessageWithQuickReplies: PushTextMessageWithQuickReplies;
      createQuickReplyItems: CreateQuickReplyItems;
      buildTemplateMessageFromPayload: BuildTemplateMessageFromPayload;
      monitorLineProvider: MonitorLineProvider;
    };
  };
  logging: {
    shouldLogVerbose: ShouldLogVerbose;
    getChildLogger: (
      bindings?: Record<string, unknown>,
      opts?: { level?: LogLevel },
    ) => RuntimeLogger;
  };
  state: {
    resolveStateDir: ResolveStateDir;
  };
};
