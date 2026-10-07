import type { GatewayService } from "../daemon/service.ts";
import { resolveNodeService } from "../daemon/node-service.ts";
import { resolveGatewayService } from "../daemon/service.ts";
import { formatDaemonRuntimeShort } from "./status.format.ts";

type DaemonStatusSummary = {
  label: string;
  installed: boolean | null;
  loadedText: string;
  runtimeShort: string | null;
};

async function buildDaemonStatusSummary(
  service: GatewayService,
  fallbackLabel: string,
): Promise<DaemonStatusSummary> {
  try {
    const [loaded, runtime, command] = await Promise.all([
      service.isLoaded({ env: process.env }).catch(() => false),
      service.readRuntime(process.env).catch(() => undefined),
      service.readCommand(process.env).catch(() => null),
    ]);
    const installed = command != null;
    const loadedText = loaded ? service.loadedText : service.notLoadedText;
    const runtimeShort = formatDaemonRuntimeShort(runtime);
    return { label: service.label, installed, loadedText, runtimeShort };
  } catch {
    return {
      label: fallbackLabel,
      installed: null,
      loadedText: "unknown",
      runtimeShort: null,
    };
  }
}

export async function getDaemonStatusSummary(): Promise<DaemonStatusSummary> {
  return await buildDaemonStatusSummary(resolveGatewayService(), "Daemon");
}

export async function getNodeDaemonStatusSummary(): Promise<DaemonStatusSummary> {
  return await buildDaemonStatusSummary(resolveNodeService(), "Node");
}
