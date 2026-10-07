import type { RuntimeEnv } from "../runtime.ts";
import type { WizardSection } from "./configure.shared.ts";
import { defaultRuntime } from "../runtime.ts";
import { runConfigureWizard } from "./configure.wizard.ts";

export async function configureCommand(runtime: RuntimeEnv = defaultRuntime) {
  await runConfigureWizard({ command: "configure" }, runtime);
}

export async function configureCommandWithSections(
  sections: WizardSection[],
  runtime: RuntimeEnv = defaultRuntime,
) {
  await runConfigureWizard({ command: "configure", sections }, runtime);
}
