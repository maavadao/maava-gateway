import type { Command } from "commander";
import { formatDocsLink } from "../../terminal/links.ts";
import { theme } from "../../terminal/theme.ts";
import { registerNodesCameraCommands } from "./register.camera.ts";
import { registerNodesCanvasCommands } from "./register.canvas.ts";
import { registerNodesInvokeCommands } from "./register.invoke.ts";
import { registerNodesLocationCommands } from "./register.location.ts";
import { registerNodesNotifyCommand } from "./register.notify.ts";
import { registerNodesPairingCommands } from "./register.pairing.ts";
import { registerNodesScreenCommands } from "./register.screen.ts";
import { registerNodesStatusCommands } from "./register.status.ts";

export function registerNodesCli(program: Command) {
  const nodes = program
    .command("nodes")
    .description("Manage gateway-owned node pairing")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/nodes", "docs.openclaw.ai/cli/nodes")}\n`,
    );

  registerNodesStatusCommands(nodes);
  registerNodesPairingCommands(nodes);
  registerNodesInvokeCommands(nodes);
  registerNodesNotifyCommand(nodes);
  registerNodesCanvasCommands(nodes);
  registerNodesCameraCommands(nodes);
  registerNodesScreenCommands(nodes);
  registerNodesLocationCommands(nodes);
}
