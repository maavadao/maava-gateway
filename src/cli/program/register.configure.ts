import type { Command } from "commander";
import {
  CONFIGURE_WIZARD_SECTIONS,
  configureCommand,
  configureCommandWithSections,
} from "../../commands/configure.ts";
import { defaultRuntime } from "../../runtime.ts";
import { formatDocsLink } from "../../terminal/links.ts";
import { theme } from "../../terminal/theme.ts";
import { runCommandWithRuntime } from "../cli-utils.ts";

export function registerConfigureCommand(program: Command) {
  program
    .command("configure")
    .description("Interactive prompt to set up credentials, devices, and agent defaults")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/configure", "docs.openclaw.ai/cli/configure")}\n`,
    )
    .option(
      "--section <section>",
      `Configuration sections (repeatable). Options: ${CONFIGURE_WIZARD_SECTIONS.join(", ")}`,
      (value: string, previous: string[]) => [...previous, value],
      [] as string[],
    )
    .action(async (opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        const sections: string[] = Array.isArray(opts.section)
          ? opts.section
              .map((value: unknown) => (typeof value === "string" ? value.trim() : ""))
              .filter(Boolean)
          : [];
        if (sections.length === 0) {
          await configureCommand(defaultRuntime);
          return;
        }

        const invalid = sections.filter((s) => !CONFIGURE_WIZARD_SECTIONS.includes(s as never));
        if (invalid.length > 0) {
          defaultRuntime.error(
            `Invalid --section: ${invalid.join(", ")}. Expected one of: ${CONFIGURE_WIZARD_SECTIONS.join(", ")}.`,
          );
          defaultRuntime.exit(1);
          return;
        }

        await configureCommandWithSections(sections as never, defaultRuntime);
      });
    });
}
