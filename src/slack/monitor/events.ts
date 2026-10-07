import type { ResolvedSlackAccount } from "../accounts.ts";
import type { SlackMonitorContext } from "./context.ts";
import type { SlackMessageHandler } from "./message-handler.ts";
import { registerSlackChannelEvents } from "./events/channels.ts";
import { registerSlackMemberEvents } from "./events/members.ts";
import { registerSlackMessageEvents } from "./events/messages.ts";
import { registerSlackPinEvents } from "./events/pins.ts";
import { registerSlackReactionEvents } from "./events/reactions.ts";

export function registerSlackMonitorEvents(params: {
  ctx: SlackMonitorContext;
  account: ResolvedSlackAccount;
  handleSlackMessage: SlackMessageHandler;
}) {
  registerSlackMessageEvents({
    ctx: params.ctx,
    handleSlackMessage: params.handleSlackMessage,
  });
  registerSlackReactionEvents({ ctx: params.ctx });
  registerSlackMemberEvents({ ctx: params.ctx });
  registerSlackChannelEvents({ ctx: params.ctx });
  registerSlackPinEvents({ ctx: params.ctx });
}
