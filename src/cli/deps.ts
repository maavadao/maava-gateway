import type { OutboundSendDeps } from "../infra/outbound/deliver.ts";
import { logWebSelfId, sendMessageWhatsApp } from "../channels/web/index.ts";
import { sendMessageDiscord } from "../discord/send.ts";
import { sendMessageIMessage } from "../imessage/send.ts";
import { sendMessageSignal } from "../signal/send.ts";
import { sendMessageSlack } from "../slack/send.ts";
import { sendMessageTelegram } from "../telegram/send.ts";

export type CliDeps = {
  sendMessageWhatsApp: typeof sendMessageWhatsApp;
  sendMessageTelegram: typeof sendMessageTelegram;
  sendMessageDiscord: typeof sendMessageDiscord;
  sendMessageSlack: typeof sendMessageSlack;
  sendMessageSignal: typeof sendMessageSignal;
  sendMessageIMessage: typeof sendMessageIMessage;
};

export function createDefaultDeps(): CliDeps {
  return {
    sendMessageWhatsApp,
    sendMessageTelegram,
    sendMessageDiscord,
    sendMessageSlack,
    sendMessageSignal,
    sendMessageIMessage,
  };
}

// Provider docking: extend this mapping when adding new outbound send deps.
export function createOutboundSendDeps(deps: CliDeps): OutboundSendDeps {
  return {
    sendWhatsApp: deps.sendMessageWhatsApp,
    sendTelegram: deps.sendMessageTelegram,
    sendDiscord: deps.sendMessageDiscord,
    sendSlack: deps.sendMessageSlack,
    sendSignal: deps.sendMessageSignal,
    sendIMessage: deps.sendMessageIMessage,
  };
}

export { logWebSelfId };
