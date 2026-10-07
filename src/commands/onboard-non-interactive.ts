import type { OpenClawConfig } from "../config/config.ts";
import type { RuntimeEnv } from "../runtime.ts";
import type { OnboardOptions } from "./onboard-types.ts";
import { formatCliCommand } from "../cli/command-format.ts";
import { readConfigFileSnapshot } from "../config/config.ts";
import { defaultRuntime } from "../runtime.ts";
import { runNonInteractiveOnboardingLocal } from "./onboard-non-interactive/local.ts";
import { runNonInteractiveOnboardingRemote } from "./onboard-non-interactive/remote.ts";

export async function runNonInteractiveOnboarding(
  opts: OnboardOptions,
  runtime: RuntimeEnv = defaultRuntime,
) {
  const snapshot = await readConfigFileSnapshot();
  if (snapshot.exists && !snapshot.valid) {
    runtime.error(
      `Config invalid. Run \`${formatCliCommand("openclaw doctor")}\` to repair it, then re-run onboarding.`,
    );
    runtime.exit(1);
    return;
  }

  const baseConfig: OpenClawConfig = snapshot.valid ? snapshot.config : {};
  const mode = opts.mode ?? "local";
  if (mode !== "local" && mode !== "remote") {
    runtime.error(`Invalid --mode "${String(mode)}" (use local|remote).`);
    runtime.exit(1);
    return;
  }

  if (mode === "remote") {
    await runNonInteractiveOnboardingRemote({ opts, runtime, baseConfig });
    return;
  }

  await runNonInteractiveOnboardingLocal({ opts, runtime, baseConfig });
}
