import type { Command } from "commander";
import { formatDocsLink } from "../../terminal/links.ts";
import { theme } from "../../terminal/theme.ts";
import {
  registerCronAddCommand,
  registerCronListCommand,
  registerCronStatusCommand,
} from "./register.cron-add.ts";
import { registerCronEditCommand } from "./register.cron-edit.ts";
import { registerCronSimpleCommands } from "./register.cron-simple.ts";

export function registerCronCli(program: Command) {
  const cron = program
    .command("cron")
    .description("Manage cron jobs (via Gateway)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/cron", "docs.openclaw.ai/cli/cron")}\n`,
    );

  registerCronStatusCommand(cron);
  registerCronListCommand(cron);
  registerCronAddCommand(cron);
  registerCronSimpleCommands(cron);
  registerCronEditCommand(cron);
}
