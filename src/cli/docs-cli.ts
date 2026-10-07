import type { Command } from "commander";
import { docsSearchCommand } from "../commands/docs.ts";
import { defaultRuntime } from "../runtime.ts";
import { formatDocsLink } from "../terminal/links.ts";
import { theme } from "../terminal/theme.ts";
import { runCommandWithRuntime } from "./cli-utils.ts";

export function registerDocsCli(program: Command) {
  program
    .command("docs")
    .description("Search the live OpenClaw docs")
    .argument("[query...]", "Search query")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/docs", "docs.openclaw.ai/cli/docs")}\n`,
    )
    .action(async (queryParts: string[]) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await docsSearchCommand(queryParts, defaultRuntime);
      });
    });
}
