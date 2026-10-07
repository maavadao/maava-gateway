import { isTruthyEnvValue } from "../infra/env.ts";
import { defaultRuntime } from "../runtime.ts";
import { VERSION } from "../version.ts";
import { getCommandPath, hasHelpOrVersion } from "./argv.ts";
import { emitCliBanner } from "./banner.ts";
import { ensurePluginRegistryLoaded } from "./plugin-registry.ts";
import { findRoutedCommand } from "./program/command-registry.ts";
import { ensureConfigReady } from "./program/config-guard.ts";

async function prepareRoutedCommand(params: {
  argv: string[];
  commandPath: string[];
  loadPlugins?: boolean;
}) {
  emitCliBanner(VERSION, { argv: params.argv });
  await ensureConfigReady({ runtime: defaultRuntime, commandPath: params.commandPath });
  if (params.loadPlugins) {
    ensurePluginRegistryLoaded();
  }
}

export async function tryRouteCli(argv: string[]): Promise<boolean> {
  if (isTruthyEnvValue(process.env.OPENCLAW_DISABLE_ROUTE_FIRST)) {
    return false;
  }
  if (hasHelpOrVersion(argv)) {
    return false;
  }

  const path = getCommandPath(argv, 2);
  if (!path[0]) {
    return false;
  }
  const route = findRoutedCommand(path);
  if (!route) {
    return false;
  }
  await prepareRoutedCommand({ argv, commandPath: path, loadPlugins: route.loadPlugins });
  return route.run(argv);
}
