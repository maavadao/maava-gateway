import JSON5 from "json5";
import fs from "node:fs/promises";
import type { RuntimeEnv } from "../runtime.ts";
import { DEFAULT_AGENT_WORKSPACE_DIR, ensureAgentWorkspace } from "../agents/workspace.ts";
import { type OpenClawConfig, createConfigIO, writeConfigFile } from "../config/config.ts";
import { formatConfigPath, logConfigUpdated } from "../config/logging.ts";
import { resolveSessionTranscriptsDir } from "../config/sessions.ts";
import { defaultRuntime } from "../runtime.ts";
import { shortenHomePath } from "../utils.ts";

async function readConfigFileRaw(configPath: string): Promise<{
  exists: boolean;
  parsed: OpenClawConfig;
}> {
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = JSON5.parse(raw);
    if (parsed && typeof parsed === "object") {
      return { exists: true, parsed: parsed as OpenClawConfig };
    }
    return { exists: true, parsed: {} };
  } catch {
    return { exists: false, parsed: {} };
  }
}

export async function setupCommand(
  opts?: { workspace?: string },
  runtime: RuntimeEnv = defaultRuntime,
) {
  const desiredWorkspace =
    typeof opts?.workspace === "string" && opts.workspace.trim()
      ? opts.workspace.trim()
      : undefined;

  const io = createConfigIO();
  const configPath = io.configPath;
  const existingRaw = await readConfigFileRaw(configPath);
  const cfg = existingRaw.parsed;
  const defaults = cfg.agents?.defaults ?? {};

  const workspace = desiredWorkspace ?? defaults.workspace ?? DEFAULT_AGENT_WORKSPACE_DIR;

  const next: OpenClawConfig = {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...defaults,
        workspace,
      },
    },
  };

  if (!existingRaw.exists || defaults.workspace !== workspace) {
    await writeConfigFile(next);
    if (!existingRaw.exists) {
      runtime.log(`Wrote ${formatConfigPath(configPath)}`);
    } else {
      logConfigUpdated(runtime, { path: configPath, suffix: "(set agents.defaults.workspace)" });
    }
  } else {
    runtime.log(`Config OK: ${formatConfigPath(configPath)}`);
  }

  const ws = await ensureAgentWorkspace({
    dir: workspace,
    ensureBootstrapFiles: !next.agents?.defaults?.skipBootstrap,
  });
  runtime.log(`Workspace OK: ${shortenHomePath(ws.dir)}`);

  const sessionsDir = resolveSessionTranscriptsDir();
  await fs.mkdir(sessionsDir, { recursive: true });
  runtime.log(`Sessions OK: ${shortenHomePath(sessionsDir)}`);
}
