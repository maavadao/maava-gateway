import type { BrowserBridge } from "../../browser/bridge-server.ts";

export const BROWSER_BRIDGES = new Map<string, { bridge: BrowserBridge; containerName: string }>();
