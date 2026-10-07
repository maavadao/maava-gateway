import type { Command } from "commander";
import { messageCommand } from "../../../commands/message.ts";
import { danger, setVerbose } from "../../../globals.ts";
import { CHANNEL_TARGET_DESCRIPTION } from "../../../infra/outbound/channel-target.ts";
import { defaultRuntime } from "../../../runtime.ts";
import { runCommandWithRuntime } from "../../cli-utils.ts";
import { createDefaultDeps } from "../../deps.ts";
import { ensurePluginRegistryLoaded } from "../../plugin-registry.ts";

export type MessageCliHelpers = {
  withMessageBase: (command: Command) => Command;
  withMessageTarget: (command: Command) => Command;
  withRequiredMessageTarget: (command: Command) => Command;
  runMessageAction: (action: string, opts: Record<string, unknown>) => Promise<void>;
};

export function createMessageCliHelpers(
  message: Command,
  messageChannelOptions: string,
): MessageCliHelpers {
  const withMessageBase = (command: Command) =>
    command
      .option("--channel <channel>", `Channel: ${messageChannelOptions}`)
      .option("--account <id>", "Channel account id (accountId)")
      .option("--json", "Output result as JSON", false)
      .option("--dry-run", "Print payload and skip sending", false)
      .option("--verbose", "Verbose logging", false);

  const withMessageTarget = (command: Command) =>
    command.option("-t, --target <dest>", CHANNEL_TARGET_DESCRIPTION);
  const withRequiredMessageTarget = (command: Command) =>
    command.requiredOption("-t, --target <dest>", CHANNEL_TARGET_DESCRIPTION);

  const runMessageAction = async (action: string, opts: Record<string, unknown>) => {
    setVerbose(Boolean(opts.verbose));
    ensurePluginRegistryLoaded();
    const deps = createDefaultDeps();
    await runCommandWithRuntime(
      defaultRuntime,
      async () => {
        await messageCommand(
          {
            ...(() => {
              const { account, ...rest } = opts;
              return {
                ...rest,
                accountId: typeof account === "string" ? account : undefined,
              };
            })(),
            action,
          },
          deps,
          defaultRuntime,
        );
      },
      (err) => {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      },
    );
  };

  // `message` is only used for `message.help({ error: true })`, keep the
  // command-specific helpers grouped here.
  void message;

  return {
    withMessageBase,
    withMessageTarget,
    withRequiredMessageTarget,
    runMessageAction,
  };
}
