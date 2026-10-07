import { Command } from "commander";
import { registerProgramCommands } from "./command-registry.ts";
import { createProgramContext } from "./context.ts";
import { configureProgramHelp } from "./help.ts";
import { registerPreActionHooks } from "./preaction.ts";

export function buildProgram() {
  const program = new Command();
  const ctx = createProgramContext();
  const argv = process.argv;

  configureProgramHelp(program, ctx);
  registerPreActionHooks(program, ctx.programVersion);

  registerProgramCommands(program, ctx, argv);

  return program;
}
