import type { RuntimeEnv } from "../runtime.ts";
import type { OnboardOptions } from "./onboard-types.ts";
import { defaultRuntime } from "../runtime.ts";
import { restoreTerminalState } from "../terminal/restore.ts";
import { createClackPrompter } from "../wizard/clack-prompter.ts";
import { runOnboardingWizard } from "../wizard/onboarding.ts";
import { WizardCancelledError } from "../wizard/prompts.ts";

export async function runInteractiveOnboarding(
  opts: OnboardOptions,
  runtime: RuntimeEnv = defaultRuntime,
) {
  const prompter = createClackPrompter();
  try {
    await runOnboardingWizard(opts, runtime, prompter);
  } catch (err) {
    if (err instanceof WizardCancelledError) {
      runtime.exit(0);
      return;
    }
    throw err;
  } finally {
    restoreTerminalState("onboarding finish");
  }
}
