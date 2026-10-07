import type { SkillCommandSpec } from "../../agents/skills.ts";
import type { ChannelId } from "../../channels/plugins/types.ts";
import type { OpenClawConfig } from "../../config/config.ts";
import type { SessionEntry, SessionScope } from "../../config/sessions.ts";
import type { MsgContext } from "../templating.ts";
import type { ElevatedLevel, ReasoningLevel, ThinkLevel, VerboseLevel } from "../thinking.ts";
import type { ReplyPayload } from "../types.ts";
import type { InlineDirectives } from "./directive-handling.ts";

export type CommandContext = {
  surface: string;
  channel: string;
  channelId?: ChannelId;
  ownerList: string[];
  isAuthorizedSender: boolean;
  senderId?: string;
  abortKey?: string;
  rawBodyNormalized: string;
  commandBodyNormalized: string;
  from?: string;
  to?: string;
};

export type HandleCommandsParams = {
  ctx: MsgContext;
  cfg: OpenClawConfig;
  command: CommandContext;
  agentId?: string;
  directives: InlineDirectives;
  elevated: {
    enabled: boolean;
    allowed: boolean;
    failures: Array<{ gate: string; key: string }>;
  };
  sessionEntry?: SessionEntry;
  previousSessionEntry?: SessionEntry;
  sessionStore?: Record<string, SessionEntry>;
  sessionKey: string;
  storePath?: string;
  sessionScope?: SessionScope;
  workspaceDir: string;
  defaultGroupActivation: () => "always" | "mention";
  resolvedThinkLevel?: ThinkLevel;
  resolvedVerboseLevel: VerboseLevel;
  resolvedReasoningLevel: ReasoningLevel;
  resolvedElevatedLevel?: ElevatedLevel;
  resolveDefaultThinkingLevel: () => Promise<ThinkLevel | undefined>;
  provider: string;
  model: string;
  contextTokens: number;
  isGroup: boolean;
  skillCommands?: SkillCommandSpec[];
};

export type CommandHandlerResult = {
  reply?: ReplyPayload;
  shouldContinue: boolean;
};

export type CommandHandler = (
  params: HandleCommandsParams,
  allowTextCommands: boolean,
) => Promise<CommandHandlerResult | null>;
