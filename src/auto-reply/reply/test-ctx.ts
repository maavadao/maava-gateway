import type { FinalizedMsgContext, MsgContext } from "../templating.ts";
import { finalizeInboundContext } from "./inbound-context.ts";

export function buildTestCtx(overrides: Partial<MsgContext> = {}): FinalizedMsgContext {
  return finalizeInboundContext({
    Body: "",
    CommandBody: "",
    CommandSource: "text",
    From: "whatsapp:+1000",
    To: "whatsapp:+2000",
    ChatType: "direct",
    Provider: "whatsapp",
    Surface: "whatsapp",
    CommandAuthorized: false,
    ...overrides,
  });
}
