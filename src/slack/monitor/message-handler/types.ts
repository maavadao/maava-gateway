import type { FinalizedMsgContext } from "../../../auto-reply/templating.ts";
import type { ResolvedAgentRoute } from "../../../routing/resolve-route.ts";
import type { ResolvedSlackAccount } from "../../accounts.ts";
import type { SlackMessageEvent } from "../../types.ts";
import type { SlackChannelConfigResolved } from "../channel-config.ts";
import type { SlackMonitorContext } from "../context.ts";

export type PreparedSlackMessage = {
  ctx: SlackMonitorContext;
  account: ResolvedSlackAccount;
  message: SlackMessageEvent;
  route: ResolvedAgentRoute;
  channelConfig: SlackChannelConfigResolved | null;
  replyTarget: string;
  ctxPayload: FinalizedMsgContext;
  isDirectMessage: boolean;
  isRoomish: boolean;
  historyKey: string;
  preview: string;
  ackReactionMessageTs?: string;
  ackReactionValue: string;
  ackReactionPromise: Promise<boolean> | null;
};
