import type { OpenClawConfig } from "../../config/config.ts";
import type { DispatchInboundResult } from "../dispatch.ts";
import type { FinalizedMsgContext, MsgContext } from "../templating.ts";
import type { GetReplyOptions } from "../types.ts";
import type {
  ReplyDispatcherOptions,
  ReplyDispatcherWithTypingOptions,
} from "./reply-dispatcher.ts";
import {
  dispatchInboundMessageWithBufferedDispatcher,
  dispatchInboundMessageWithDispatcher,
} from "../dispatch.ts";

export async function dispatchReplyWithBufferedBlockDispatcher(params: {
  ctx: MsgContext | FinalizedMsgContext;
  cfg: OpenClawConfig;
  dispatcherOptions: ReplyDispatcherWithTypingOptions;
  replyOptions?: Omit<GetReplyOptions, "onToolResult" | "onBlockReply">;
  replyResolver?: typeof import("../reply.ts").getReplyFromConfig;
}): Promise<DispatchInboundResult> {
  return await dispatchInboundMessageWithBufferedDispatcher({
    ctx: params.ctx,
    cfg: params.cfg,
    dispatcherOptions: params.dispatcherOptions,
    replyResolver: params.replyResolver,
    replyOptions: params.replyOptions,
  });
}

export async function dispatchReplyWithDispatcher(params: {
  ctx: MsgContext | FinalizedMsgContext;
  cfg: OpenClawConfig;
  dispatcherOptions: ReplyDispatcherOptions;
  replyOptions?: Omit<GetReplyOptions, "onToolResult" | "onBlockReply">;
  replyResolver?: typeof import("../reply.ts").getReplyFromConfig;
}): Promise<DispatchInboundResult> {
  return await dispatchInboundMessageWithDispatcher({
    ctx: params.ctx,
    cfg: params.cfg,
    dispatcherOptions: params.dispatcherOptions,
    replyResolver: params.replyResolver,
    replyOptions: params.replyOptions,
  });
}
