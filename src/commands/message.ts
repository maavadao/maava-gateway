import type { OutboundSendDeps } from "../infra/outbound/deliver.ts";
import type { RuntimeEnv } from "../runtime.ts";
import {
  CHANNEL_MESSAGE_ACTION_NAMES,
  type ChannelMessageActionName,
} from "../channels/plugins/types.ts";
import { createOutboundSendDeps, type CliDeps } from "../cli/outbound-send-deps.ts";
import { withProgress } from "../cli/progress.ts";
import { loadConfig } from "../config/config.ts";
import { runMessageAction } from "../infra/outbound/message-action-runner.ts";
import { GATEWAY_CLIENT_MODES, GATEWAY_CLIENT_NAMES } from "../utils/message-channel.ts";
import { buildMessageCliJson, formatMessageCliText } from "./message-format.ts";

export async function messageCommand(
  opts: Record<string, unknown>,
  deps: CliDeps,
  runtime: RuntimeEnv,
) {
  const cfg = loadConfig();
  const rawAction = typeof opts.action === "string" ? opts.action.trim() : "";
  const actionInput = rawAction || "send";
  const actionMatch = (CHANNEL_MESSAGE_ACTION_NAMES as readonly string[]).find(
    (name) => name.toLowerCase() === actionInput.toLowerCase(),
  );
  if (!actionMatch) {
    throw new Error(`Unknown message action: ${actionInput}`);
  }
  const action = actionMatch as ChannelMessageActionName;

  const outboundDeps: OutboundSendDeps = createOutboundSendDeps(deps);

  const run = async () =>
    await runMessageAction({
      cfg,
      action,
      params: opts,
      deps: outboundDeps,
      gateway: {
        clientName: GATEWAY_CLIENT_NAMES.CLI,
        mode: GATEWAY_CLIENT_MODES.CLI,
      },
    });

  const json = opts.json === true;
  const dryRun = opts.dryRun === true;
  const needsSpinner = !json && !dryRun && (action === "send" || action === "poll");

  const result = needsSpinner
    ? await withProgress(
        {
          label: action === "poll" ? "Sending poll..." : "Sending...",
          indeterminate: true,
          enabled: true,
        },
        run,
      )
    : await run();

  if (json) {
    runtime.log(JSON.stringify(buildMessageCliJson(result), null, 2));
    return;
  }

  for (const line of formatMessageCliText(result)) {
    runtime.log(line);
  }
}
