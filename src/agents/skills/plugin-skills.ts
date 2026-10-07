import fs from "node:fs";
import path from "node:path";
import type { OpenClawConfig } from "../../config/config.ts";
import { createSubsystemLogger } from "../../logging/subsystem.ts";
import {
  normalizePluginsConfig,
  resolveEnableState,
  resolveMemorySlotDecision,
} from "../../plugins/config-state.ts";
import { loadPluginManifestRegistry } from "../../plugins/manifest-registry.ts";

const log = createSubsystemLogger("skills");

export function resolvePluginSkillDirs(params: {
  workspaceDir: string;
  config?: OpenClawConfig;
}): string[] {
  const workspaceDir = params.workspaceDir.trim();
  if (!workspaceDir) {
    return [];
  }
  const registry = loadPluginManifestRegistry({
    workspaceDir,
    config: params.config,
  });
  if (registry.plugins.length === 0) {
    return [];
  }
  const normalizedPlugins = normalizePluginsConfig(params.config?.plugins);
  const memorySlot = normalizedPlugins.slots.memory;
  let selectedMemoryPluginId: string | null = null;
  const seen = new Set<string>();
  const resolved: string[] = [];

  for (const record of registry.plugins) {
    if (!record.skills || record.skills.length === 0) {
      continue;
    }
    const enableState = resolveEnableState(record.id, record.origin, normalizedPlugins);
    if (!enableState.enabled) {
      continue;
    }
    const memoryDecision = resolveMemorySlotDecision({
      id: record.id,
      kind: record.kind,
      slot: memorySlot,
      selectedId: selectedMemoryPluginId,
    });
    if (!memoryDecision.enabled) {
      continue;
    }
    if (memoryDecision.selected && record.kind === "memory") {
      selectedMemoryPluginId = record.id;
    }
    for (const raw of record.skills) {
      const trimmed = raw.trim();
      if (!trimmed) {
        continue;
      }
      const candidate = path.resolve(record.rootDir, trimmed);
      if (!fs.existsSync(candidate)) {
        log.warn(`plugin skill path not found (${record.id}): ${candidate}`);
        continue;
      }
      if (seen.has(candidate)) {
        continue;
      }
      seen.add(candidate);
      resolved.push(candidate);
    }
  }

  return resolved;
}
