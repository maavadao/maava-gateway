import type { RuntimeEnv } from "../runtime.ts";
import { displayPath } from "../utils.ts";
import { CONFIG_PATH } from "./paths.ts";

type LogConfigUpdatedOptions = {
  path?: string;
  suffix?: string;
};

export function formatConfigPath(path: string = CONFIG_PATH): string {
  return displayPath(path);
}

export function logConfigUpdated(runtime: RuntimeEnv, opts: LogConfigUpdatedOptions = {}): void {
  const path = formatConfigPath(opts.path ?? CONFIG_PATH);
  const suffix = opts.suffix ? ` ${opts.suffix}` : "";
  runtime.log(`Updated ${path}${suffix}`);
}
