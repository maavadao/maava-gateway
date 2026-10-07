// @ts-nocheck
import { buildTelegramMessageContext } from "./bot-message-context.ts";
import { dispatchTelegramMessage } from "./bot-message-dispatch.ts";

export const createTelegramMessageProcessor = (deps) => {
  const {
    bot,
    cfg,
    account,
    telegramCfg,
    historyLimit,
    groupHistories,
    dmPolicy,
    allowFrom,
    groupAllowFrom,
    ackReactionScope,
    logger,
    resolveGroupActivation,
    resolveGroupRequireMention,
    resolveTelegramGroupConfig,
    runtime,
    replyToMode,
    streamMode,
    textLimit,
    opts,
    resolveBotTopicsEnabled,
  } = deps;

  return async (primaryCtx, allMedia, storeAllowFrom, options) => {
    const context = await buildTelegramMessageContext({
      primaryCtx,
      allMedia,
      storeAllowFrom,
      options,
      bot,
      cfg,
      account,
      historyLimit,
      groupHistories,
      dmPolicy,
      allowFrom,
      groupAllowFrom,
      ackReactionScope,
      logger,
      resolveGroupActivation,
      resolveGroupRequireMention,
      resolveTelegramGroupConfig,
    });
    if (!context) {
      return;
    }
    await dispatchTelegramMessage({
      context,
      bot,
      cfg,
      runtime,
      replyToMode,
      streamMode,
      textLimit,
      telegramCfg,
      opts,
      resolveBotTopicsEnabled,
    });
  };
};
