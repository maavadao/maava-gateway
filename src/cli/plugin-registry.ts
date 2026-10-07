import type { PluginLogger } from "../plugins/types.ts";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.ts";
import { loadConfig } from "../config/config.ts";
import { createSubsystemLogger } from "../logging.ts";
import { loadOpenClawPlugins } from "../plugins/loader.ts";

const log = createSubsystemLogger("plugins");
let pluginRegistryLoaded = false;

export function ensurePluginRegistryLoaded(): void {
  if (pluginRegistryLoaded) {
    return;
  }
  const config = loadConfig();
  const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
  const logger: PluginLogger = {
    info: (msg) => log.info(msg),
    warn: (msg) => log.warn(msg),
    error: (msg) => log.error(msg),
    debug: (msg) => log.debug(msg),
  };
  loadOpenClawPlugins({
    config,
    workspaceDir,
    logger,
  });
  pluginRegistryLoaded = true;
}
