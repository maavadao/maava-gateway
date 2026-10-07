import { defaultRuntime } from "../../runtime.ts";
import { isRich, theme } from "../../terminal/theme.ts";
import { runCommandWithRuntime } from "../cli-utils.ts";
import { unauthorizedHintForMessage } from "./rpc.ts";

export function getNodesTheme() {
  const rich = isRich();
  const color = (fn: (value: string) => string) => (value: string) => (rich ? fn(value) : value);
  return {
    rich,
    heading: color(theme.heading),
    ok: color(theme.success),
    warn: color(theme.warn),
    muted: color(theme.muted),
    error: color(theme.error),
  };
}

export function runNodesCommand(label: string, action: () => Promise<void>) {
  return runCommandWithRuntime(defaultRuntime, action, (err) => {
    const message = String(err);
    const { error, warn } = getNodesTheme();
    defaultRuntime.error(error(`nodes ${label} failed: ${message}`));
    const hint = unauthorizedHintForMessage(message);
    if (hint) {
      defaultRuntime.error(warn(hint));
    }
    defaultRuntime.exit(1);
  });
}
