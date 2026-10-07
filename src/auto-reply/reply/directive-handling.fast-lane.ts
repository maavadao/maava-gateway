import type { ModelAliasIndex } from "../../agents/model-selection.ts";
import type { OpenClawConfig } from "../../config/config.ts";
import type { SessionEntry } from "../../config/sessions.ts";
import type { MsgContext } from "../templating.ts";
import type { ReplyPayload } from "../types.ts";
import type { InlineDirectives } from "./directive-handling.parse.ts";
import type { ElevatedLevel, ReasoningLevel, ThinkLevel, VerboseLevel } from "./directives.ts";
import { handleDirectiveOnly } from "./directive-handling.impl.ts";
import { isDirectiveOnly } from "./directive-handling.parse.ts";

export async function applyInlineDirectivesFastLane(params: {
  directives: InlineDirectives;
  commandAuthorized: boolean;
  ctx: MsgContext;
  cfg: OpenClawConfig;
  agentId?: string;
  isGroup: boolean;
  sessionEntry: SessionEntry;
  sessionStore: Record<string, SessionEntry>;
  sessionKey: string;
  storePath?: string;
  elevatedEnabled: boolean;
  elevatedAllowed: boolean;
  elevatedFailures?: Array<{ gate: string; key: string }>;
  messageProviderKey?: string;
  defaultProvider: string;
  defaultModel: string;
  aliasIndex: ModelAliasIndex;
  allowedModelKeys: Set<string>;
  allowedModelCatalog: Awaited<
    ReturnType<typeof import("../../agents/model-catalog.ts").loadModelCatalog>
  >;
  resetModelOverride: boolean;
  provider: string;
  model: string;
  initialModelLabel: string;
  formatModelSwitchEvent: (label: string, alias?: string) => string;
  agentCfg?: NonNullable<OpenClawConfig["agents"]>["defaults"];
  modelState: {
    resolveDefaultThinkingLevel: () => Promise<ThinkLevel | undefined>;
    allowedModelKeys: Set<string>;
    allowedModelCatalog: Awaited<
      ReturnType<typeof import("../../agents/model-catalog.ts").loadModelCatalog>
    >;
    resetModelOverride: boolean;
  };
}): Promise<{ directiveAck?: ReplyPayload; provider: string; model: string }> {
  const {
    directives,
    commandAuthorized,
    ctx,
    cfg,
    agentId,
    isGroup,
    sessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    elevatedEnabled,
    elevatedAllowed,
    elevatedFailures,
    messageProviderKey,
    defaultProvider,
    defaultModel,
    aliasIndex,
    allowedModelKeys,
    allowedModelCatalog,
    resetModelOverride,
    formatModelSwitchEvent,
    modelState,
  } = params;

  let { provider, model } = params;
  if (
    !commandAuthorized ||
    isDirectiveOnly({
      directives,
      cleanedBody: directives.cleaned,
      ctx,
      cfg,
      agentId,
      isGroup,
    })
  ) {
    return { directiveAck: undefined, provider, model };
  }

  const agentCfg = params.agentCfg;
  const resolvedDefaultThinkLevel =
    (sessionEntry?.thinkingLevel as ThinkLevel | undefined) ??
    (agentCfg?.thinkingDefault as ThinkLevel | undefined) ??
    (await modelState.resolveDefaultThinkingLevel());
  const currentThinkLevel = resolvedDefaultThinkLevel;
  const currentVerboseLevel =
    (sessionEntry?.verboseLevel as VerboseLevel | undefined) ??
    (agentCfg?.verboseDefault as VerboseLevel | undefined);
  const currentReasoningLevel =
    (sessionEntry?.reasoningLevel as ReasoningLevel | undefined) ?? "off";
  const currentElevatedLevel =
    (sessionEntry?.elevatedLevel as ElevatedLevel | undefined) ??
    (agentCfg?.elevatedDefault as ElevatedLevel | undefined);

  const directiveAck = await handleDirectiveOnly({
    cfg,
    directives,
    sessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    elevatedEnabled,
    elevatedAllowed,
    elevatedFailures,
    messageProviderKey,
    defaultProvider,
    defaultModel,
    aliasIndex,
    allowedModelKeys,
    allowedModelCatalog,
    resetModelOverride,
    provider,
    model,
    initialModelLabel: params.initialModelLabel,
    formatModelSwitchEvent,
    currentThinkLevel,
    currentVerboseLevel,
    currentReasoningLevel,
    currentElevatedLevel,
  });

  if (sessionEntry?.providerOverride) {
    provider = sessionEntry.providerOverride;
  }
  if (sessionEntry?.modelOverride) {
    model = sessionEntry.modelOverride;
  }

  return { directiveAck, provider, model };
}
