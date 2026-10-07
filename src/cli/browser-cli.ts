import type { Command } from "commander";
import type { BrowserParentOpts } from "./browser-cli-shared.ts";
import { danger } from "../globals.ts";
import { defaultRuntime } from "../runtime.ts";
import { formatDocsLink } from "../terminal/links.ts";
import { theme } from "../terminal/theme.ts";
import { registerBrowserActionInputCommands } from "./browser-cli-actions-input.ts";
import { registerBrowserActionObserveCommands } from "./browser-cli-actions-observe.ts";
import { registerBrowserDebugCommands } from "./browser-cli-debug.ts";
import { browserActionExamples, browserCoreExamples } from "./browser-cli-examples.ts";
import { registerBrowserExtensionCommands } from "./browser-cli-extension.ts";
import { registerBrowserInspectCommands } from "./browser-cli-inspect.ts";
import { registerBrowserManageCommands } from "./browser-cli-manage.ts";
import { registerBrowserStateCommands } from "./browser-cli-state.ts";
import { formatCliCommand } from "./command-format.ts";
import { addGatewayClientOptions } from "./gateway-rpc.ts";
import { formatHelpExamples } from "./help-format.ts";

export function registerBrowserCli(program: Command) {
  const browser = program
    .command("browser")
    .description("Manage OpenClaw's dedicated browser (Chrome/Chromium)")
    .option("--browser-profile <name>", "Browser profile name (default from config)")
    .option("--json", "Output machine-readable JSON", false)
    .addHelpText(
      "after",
      () =>
        `\n${theme.heading("Examples:")}\n${formatHelpExamples(
          [...browserCoreExamples, ...browserActionExamples].map((cmd) => [cmd, ""]),
          true,
        )}\n\n${theme.muted("Docs:")} ${formatDocsLink(
          "/cli/browser",
          "docs.openclaw.ai/cli/browser",
        )}\n`,
    )
    .action(() => {
      browser.outputHelp();
      defaultRuntime.error(
        danger(`Missing subcommand. Try: "${formatCliCommand("openclaw browser status")}"`),
      );
      defaultRuntime.exit(1);
    });

  addGatewayClientOptions(browser);

  const parentOpts = (cmd: Command) => cmd.parent?.opts?.() as BrowserParentOpts;

  registerBrowserManageCommands(browser, parentOpts);
  registerBrowserExtensionCommands(browser, parentOpts);
  registerBrowserInspectCommands(browser, parentOpts);
  registerBrowserActionInputCommands(browser, parentOpts);
  registerBrowserActionObserveCommands(browser, parentOpts);
  registerBrowserDebugCommands(browser, parentOpts);
  registerBrowserStateCommands(browser, parentOpts);
}
