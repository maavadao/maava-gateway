import type { PluginRegistry } from "./registry.ts";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.ts";
import { resolveDefaultAgentWorkspaceDir } from "../agents/workspace.ts";
import { loadConfig } from "../config/config.ts";
import { createSubsystemLogger } from "../logging/subsystem.ts";
import { loadOpenClawPlugins } from "./loader.ts";

export type PluginStatusReport = PluginRegistry & {
  workspaceDir?: string;
};

const log = createSubsystemLogger("plugins");

export function buildPluginStatusReport(params?: {
  config?: ReturnType<typeof loadConfig>;
  workspaceDir?: string;
}): PluginStatusReport {
  const config = params?.config ?? loadConfig();
  const workspaceDir = params?.workspaceDir
    ? params.workspaceDir
    : (resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config)) ??
      resolveDefaultAgentWorkspaceDir());

  const registry = loadOpenClawPlugins({
    config,
    workspaceDir,
    logger: {
      info: (msg) => log.info(msg),
      warn: (msg) => log.warn(msg),
      error: (msg) => log.error(msg),
      debug: (msg) => log.debug(msg),
    },
  });

  return {
    workspaceDir,
    ...registry,
  };
}
