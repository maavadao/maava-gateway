import type { GetReplyOptions } from "../auto-reply/types.ts";
import type { OpenClawConfig } from "../config/config.ts";
import { resolveEffectiveMessagesConfig, resolveIdentityName } from "../agents/identity.ts";
import {
  extractShortModelName,
  type ResponsePrefixContext,
} from "../auto-reply/reply/response-prefix-template.ts";

type ModelSelectionContext = Parameters<NonNullable<GetReplyOptions["onModelSelected"]>>[0];

export type ReplyPrefixContextBundle = {
  prefixContext: ResponsePrefixContext;
  responsePrefix?: string;
  responsePrefixContextProvider: () => ResponsePrefixContext;
  onModelSelected: (ctx: ModelSelectionContext) => void;
};

export function createReplyPrefixContext(params: {
  cfg: OpenClawConfig;
  agentId: string;
}): ReplyPrefixContextBundle {
  const { cfg, agentId } = params;
  const prefixContext: ResponsePrefixContext = {
    identityName: resolveIdentityName(cfg, agentId),
  };

  const onModelSelected = (ctx: ModelSelectionContext) => {
    // Mutate the object directly instead of reassigning to ensure closures see updates.
    prefixContext.provider = ctx.provider;
    prefixContext.model = extractShortModelName(ctx.model);
    prefixContext.modelFull = `${ctx.provider}/${ctx.model}`;
    prefixContext.thinkingLevel = ctx.thinkLevel ?? "off";
  };

  return {
    prefixContext,
    responsePrefix: resolveEffectiveMessagesConfig(cfg, agentId).responsePrefix,
    responsePrefixContextProvider: () => prefixContext,
    onModelSelected,
  };
}
