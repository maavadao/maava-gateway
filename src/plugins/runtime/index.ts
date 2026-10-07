import { createRequire } from "node:module";
import type { PluginRuntime } from "./types.ts";
import { resolveEffectiveMessagesConfig, resolveHumanDelayConfig } from "../../agents/identity.ts";
import { createMemoryGetTool, createMemorySearchTool } from "../../agents/tools/memory-tool.ts";
import { handleSlackAction } from "../../agents/tools/slack-actions.ts";
import { handleWhatsAppAction } from "../../agents/tools/whatsapp-actions.ts";
import {
  chunkByNewline,
  chunkMarkdownText,
  chunkMarkdownTextWithMode,
  chunkText,
  chunkTextWithMode,
  resolveChunkMode,
  resolveTextChunkLimit,
} from "../../auto-reply/chunk.ts";
import {
  hasControlCommand,
  isControlCommandMessage,
  shouldComputeCommandAuthorized,
} from "../../auto-reply/command-detection.ts";
import { shouldHandleTextCommands } from "../../auto-reply/commands-registry.ts";
import {
  formatAgentEnvelope,
  formatInboundEnvelope,
  resolveEnvelopeFormatOptions,
} from "../../auto-reply/envelope.ts";
import {
  createInboundDebouncer,
  resolveInboundDebounceMs,
} from "../../auto-reply/inbound-debounce.ts";
import { dispatchReplyFromConfig } from "../../auto-reply/reply/dispatch-from-config.ts";
import { finalizeInboundContext } from "../../auto-reply/reply/inbound-context.ts";
import {
  buildMentionRegexes,
  matchesMentionPatterns,
  matchesMentionWithExplicit,
} from "../../auto-reply/reply/mentions.ts";
import { dispatchReplyWithBufferedBlockDispatcher } from "../../auto-reply/reply/provider-dispatcher.ts";
import { createReplyDispatcherWithTyping } from "../../auto-reply/reply/reply-dispatcher.ts";
import { removeAckReactionAfterReply, shouldAckReaction } from "../../channels/ack-reactions.ts";
import { resolveCommandAuthorizedFromAuthorizers } from "../../channels/command-gating.ts";
import { discordMessageActions } from "../../channels/plugins/actions/discord.ts";
import { signalMessageActions } from "../../channels/plugins/actions/signal.ts";
import { telegramMessageActions } from "../../channels/plugins/actions/telegram.ts";
import { createWhatsAppLoginTool } from "../../channels/plugins/agent-tools/whatsapp-login.ts";
import { recordInboundSession } from "../../channels/session.ts";
import { monitorWebChannel } from "../../channels/web/index.ts";
import { registerMemoryCli } from "../../cli/memory-cli.ts";
import { loadConfig, writeConfigFile } from "../../config/config.ts";
import {
  resolveChannelGroupPolicy,
  resolveChannelGroupRequireMention,
} from "../../config/group-policy.ts";
import { resolveMarkdownTableMode } from "../../config/markdown-tables.ts";
import { resolveStateDir } from "../../config/paths.ts";
import {
  readSessionUpdatedAt,
  recordSessionMetaFromInbound,
  resolveStorePath,
  updateLastRoute,
} from "../../config/sessions.ts";
import { auditDiscordChannelPermissions } from "../../discord/audit.ts";
import {
  listDiscordDirectoryGroupsLive,
  listDiscordDirectoryPeersLive,
} from "../../discord/directory-live.ts";
import { monitorDiscordProvider } from "../../discord/monitor.ts";
import { probeDiscord } from "../../discord/probe.ts";
import { resolveDiscordChannelAllowlist } from "../../discord/resolve-channels.ts";
import { resolveDiscordUserAllowlist } from "../../discord/resolve-users.ts";
import { sendMessageDiscord, sendPollDiscord } from "../../discord/send.ts";
import { shouldLogVerbose } from "../../globals.ts";
import { monitorIMessageProvider } from "../../imessage/monitor.ts";
import { probeIMessage } from "../../imessage/probe.ts";
import { sendMessageIMessage } from "../../imessage/send.ts";
import { getChannelActivity, recordChannelActivity } from "../../infra/channel-activity.ts";
import { enqueueSystemEvent } from "../../infra/system-events.ts";
import {
  listLineAccountIds,
  normalizeAccountId as normalizeLineAccountId,
  resolveDefaultLineAccountId,
  resolveLineAccount,
} from "../../line/accounts.ts";
import { monitorLineProvider } from "../../line/monitor.ts";
import { probeLineBot } from "../../line/probe.ts";
import {
  createQuickReplyItems,
  pushMessageLine,
  pushMessagesLine,
  pushFlexMessage,
  pushTemplateMessage,
  pushLocationMessage,
  pushTextMessageWithQuickReplies,
  sendMessageLine,
} from "../../line/send.ts";
import { buildTemplateMessageFromPayload } from "../../line/template-messages.ts";
import { getChildLogger } from "../../logging.ts";
import { normalizeLogLevel } from "../../logging/levels.ts";
import { convertMarkdownTables } from "../../markdown/tables.ts";
import { isVoiceCompatibleAudio } from "../../media/audio.ts";
import { mediaKindFromMime } from "../../media/constants.ts";
import { fetchRemoteMedia } from "../../media/fetch.ts";
import { getImageMetadata, resizeToJpeg } from "../../media/image-ops.ts";
import { detectMime } from "../../media/mime.ts";
import { saveMediaBuffer } from "../../media/store.ts";
import { buildPairingReply } from "../../pairing/pairing-messages.ts";
import {
  readChannelAllowFromStore,
  upsertChannelPairingRequest,
} from "../../pairing/pairing-store.ts";
import { runCommandWithTimeout } from "../../process/exec.ts";
import { resolveAgentRoute } from "../../routing/resolve-route.ts";
import { monitorSignalProvider } from "../../signal/index.ts";
import { probeSignal } from "../../signal/probe.ts";
import { sendMessageSignal } from "../../signal/send.ts";
import {
  listSlackDirectoryGroupsLive,
  listSlackDirectoryPeersLive,
} from "../../slack/directory-live.ts";
import { monitorSlackProvider } from "../../slack/index.ts";
import { probeSlack } from "../../slack/probe.ts";
import { resolveSlackChannelAllowlist } from "../../slack/resolve-channels.ts";
import { resolveSlackUserAllowlist } from "../../slack/resolve-users.ts";
import { sendMessageSlack } from "../../slack/send.ts";
import {
  auditTelegramGroupMembership,
  collectTelegramUnmentionedGroupIds,
} from "../../telegram/audit.ts";
import { monitorTelegramProvider } from "../../telegram/monitor.ts";
import { probeTelegram } from "../../telegram/probe.ts";
import { sendMessageTelegram } from "../../telegram/send.ts";
import { resolveTelegramToken } from "../../telegram/token.ts";
import { textToSpeechTelephony } from "../../tts/tts.ts";
import { getActiveWebListener } from "../../web/active-listener.ts";
import {
  getWebAuthAgeMs,
  logoutWeb,
  logWebSelfId,
  readWebSelfId,
  webAuthExists,
} from "../../web/auth-store.ts";
import { startWebLoginWithQr, waitForWebLogin } from "../../web/login-qr.ts";
import { loginWeb } from "../../web/login.ts";
import { loadWebMedia } from "../../web/media.ts";
import { sendMessageWhatsApp, sendPollWhatsApp } from "../../web/outbound.ts";
import { formatNativeDependencyHint } from "./native-deps.ts";

let cachedVersion: string | null = null;

function resolveVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("../../../package.json") as { version?: string };
    cachedVersion = pkg.version ?? "unknown";
    return cachedVersion;
  } catch {
    cachedVersion = "unknown";
    return cachedVersion;
  }
}

export function createPluginRuntime(): PluginRuntime {
  return {
    version: resolveVersion(),
    config: {
      loadConfig,
      writeConfigFile,
    },
    system: {
      enqueueSystemEvent,
      runCommandWithTimeout,
      formatNativeDependencyHint,
    },
    media: {
      loadWebMedia,
      detectMime,
      mediaKindFromMime,
      isVoiceCompatibleAudio,
      getImageMetadata,
      resizeToJpeg,
    },
    tts: {
      textToSpeechTelephony,
    },
    tools: {
      createMemoryGetTool,
      createMemorySearchTool,
      registerMemoryCli,
    },
    channel: {
      text: {
        chunkByNewline,
        chunkMarkdownText,
        chunkMarkdownTextWithMode,
        chunkText,
        chunkTextWithMode,
        resolveChunkMode,
        resolveTextChunkLimit,
        hasControlCommand,
        resolveMarkdownTableMode,
        convertMarkdownTables,
      },
      reply: {
        dispatchReplyWithBufferedBlockDispatcher,
        createReplyDispatcherWithTyping,
        resolveEffectiveMessagesConfig,
        resolveHumanDelayConfig,
        dispatchReplyFromConfig,
        finalizeInboundContext,
        formatAgentEnvelope,
        formatInboundEnvelope,
        resolveEnvelopeFormatOptions,
      },
      routing: {
        resolveAgentRoute,
      },
      pairing: {
        buildPairingReply,
        readAllowFromStore: readChannelAllowFromStore,
        upsertPairingRequest: upsertChannelPairingRequest,
      },
      media: {
        fetchRemoteMedia,
        saveMediaBuffer,
      },
      activity: {
        record: recordChannelActivity,
        get: getChannelActivity,
      },
      session: {
        resolveStorePath,
        readSessionUpdatedAt,
        recordSessionMetaFromInbound,
        recordInboundSession,
        updateLastRoute,
      },
      mentions: {
        buildMentionRegexes,
        matchesMentionPatterns,
        matchesMentionWithExplicit,
      },
      reactions: {
        shouldAckReaction,
        removeAckReactionAfterReply,
      },
      groups: {
        resolveGroupPolicy: resolveChannelGroupPolicy,
        resolveRequireMention: resolveChannelGroupRequireMention,
      },
      debounce: {
        createInboundDebouncer,
        resolveInboundDebounceMs,
      },
      commands: {
        resolveCommandAuthorizedFromAuthorizers,
        isControlCommandMessage,
        shouldComputeCommandAuthorized,
        shouldHandleTextCommands,
      },
      discord: {
        messageActions: discordMessageActions,
        auditChannelPermissions: auditDiscordChannelPermissions,
        listDirectoryGroupsLive: listDiscordDirectoryGroupsLive,
        listDirectoryPeersLive: listDiscordDirectoryPeersLive,
        probeDiscord,
        resolveChannelAllowlist: resolveDiscordChannelAllowlist,
        resolveUserAllowlist: resolveDiscordUserAllowlist,
        sendMessageDiscord,
        sendPollDiscord,
        monitorDiscordProvider,
      },
      slack: {
        listDirectoryGroupsLive: listSlackDirectoryGroupsLive,
        listDirectoryPeersLive: listSlackDirectoryPeersLive,
        probeSlack,
        resolveChannelAllowlist: resolveSlackChannelAllowlist,
        resolveUserAllowlist: resolveSlackUserAllowlist,
        sendMessageSlack,
        monitorSlackProvider,
        handleSlackAction,
      },
      telegram: {
        auditGroupMembership: auditTelegramGroupMembership,
        collectUnmentionedGroupIds: collectTelegramUnmentionedGroupIds,
        probeTelegram,
        resolveTelegramToken,
        sendMessageTelegram,
        monitorTelegramProvider,
        messageActions: telegramMessageActions,
      },
      signal: {
        probeSignal,
        sendMessageSignal,
        monitorSignalProvider,
        messageActions: signalMessageActions,
      },
      imessage: {
        monitorIMessageProvider,
        probeIMessage,
        sendMessageIMessage,
      },
      whatsapp: {
        getActiveWebListener,
        getWebAuthAgeMs,
        logoutWeb,
        logWebSelfId,
        readWebSelfId,
        webAuthExists,
        sendMessageWhatsApp,
        sendPollWhatsApp,
        loginWeb,
        startWebLoginWithQr,
        waitForWebLogin,
        monitorWebChannel,
        handleWhatsAppAction,
        createLoginTool: createWhatsAppLoginTool,
      },
      line: {
        listLineAccountIds,
        resolveDefaultLineAccountId,
        resolveLineAccount,
        normalizeAccountId: normalizeLineAccountId,
        probeLineBot,
        sendMessageLine,
        pushMessageLine,
        pushMessagesLine,
        pushFlexMessage,
        pushTemplateMessage,
        pushLocationMessage,
        pushTextMessageWithQuickReplies,
        createQuickReplyItems,
        buildTemplateMessageFromPayload,
        monitorLineProvider,
      },
    },
    logging: {
      shouldLogVerbose,
      getChildLogger: (bindings, opts) => {
        const logger = getChildLogger(bindings, {
          level: opts?.level ? normalizeLogLevel(opts.level) : undefined,
        });
        return {
          debug: (message) => logger.debug?.(message),
          info: (message) => logger.info(message),
          warn: (message) => logger.warn(message),
          error: (message) => logger.error(message),
        };
      },
    },
    state: {
      resolveStateDir,
    },
  };
}

export type { PluginRuntime } from "./types.ts";
