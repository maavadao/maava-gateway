import fs from "node:fs";
import path from "node:path";
import type { AuthProfileStore } from "./types.ts";
import { saveJsonFile } from "../../infra/json-file.ts";
import { resolveUserPath } from "../../utils.ts";
import { resolveOpenClawAgentDir } from "../agent-paths.ts";
import { AUTH_PROFILE_FILENAME, AUTH_STORE_VERSION, LEGACY_AUTH_FILENAME } from "./constants.ts";

export function resolveAuthStorePath(agentDir?: string): string {
  const resolved = resolveUserPath(agentDir ?? resolveOpenClawAgentDir());
  return path.join(resolved, AUTH_PROFILE_FILENAME);
}

export function resolveLegacyAuthStorePath(agentDir?: string): string {
  const resolved = resolveUserPath(agentDir ?? resolveOpenClawAgentDir());
  return path.join(resolved, LEGACY_AUTH_FILENAME);
}

export function resolveAuthStorePathForDisplay(agentDir?: string): string {
  const pathname = resolveAuthStorePath(agentDir);
  return pathname.startsWith("~") ? pathname : resolveUserPath(pathname);
}

export function ensureAuthStoreFile(pathname: string) {
  if (fs.existsSync(pathname)) {
    return;
  }
  const payload: AuthProfileStore = {
    version: AUTH_STORE_VERSION,
    profiles: {},
  };
  saveJsonFile(pathname, payload);
}
