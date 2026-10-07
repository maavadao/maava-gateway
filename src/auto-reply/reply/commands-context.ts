import type { OpenClawConfig } from "../../config/config.ts";
import type { MsgContext } from "../templating.ts";
import type { CommandContext } from "./commands-types.ts";
import { resolveCommandAuthorization } from "../command-auth.ts";
import { normalizeCommandBody } from "../commands-registry.ts";
import { stripMentions } from "./mentions.ts";

export function buildCommandContext(params: {
  ctx: MsgContext;
  cfg: OpenClawConfig;
  agentId?: string;
  sessionKey?: string;
  isGroup: boolean;
  triggerBodyNormalized: string;
  commandAuthorized: boolean;
}): CommandContext {
  const { ctx, cfg, agentId, sessionKey, isGroup, triggerBodyNormalized } = params;
  const auth = resolveCommandAuthorization({
    ctx,
    cfg,
    commandAuthorized: params.commandAuthorized,
  });
  const surface = (ctx.Surface ?? ctx.Provider ?? "").trim().toLowerCase();
  const channel = (ctx.Provider ?? surface).trim().toLowerCase();
  const abortKey = sessionKey ?? (auth.from || undefined) ?? (auth.to || undefined);
  const rawBodyNormalized = triggerBodyNormalized;
  const commandBodyNormalized = normalizeCommandBody(
    isGroup ? stripMentions(rawBodyNormalized, ctx, cfg, agentId) : rawBodyNormalized,
  );

  return {
    surface,
    channel,
    channelId: auth.providerId,
    ownerList: auth.ownerList,
    isAuthorizedSender: auth.isAuthorizedSender,
    senderId: auth.senderId,
    abortKey,
    rawBodyNormalized,
    commandBodyNormalized,
    from: auth.from,
    to: auth.to,
  };
}
