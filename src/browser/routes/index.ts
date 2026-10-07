import type { BrowserRouteContext } from "../server-context.ts";
import type { BrowserRouteRegistrar } from "./types.ts";
import { registerBrowserAgentRoutes } from "./agent.ts";
import { registerBrowserBasicRoutes } from "./basic.ts";
import { registerBrowserTabRoutes } from "./tabs.ts";

export function registerBrowserRoutes(app: BrowserRouteRegistrar, ctx: BrowserRouteContext) {
  registerBrowserBasicRoutes(app, ctx);
  registerBrowserTabRoutes(app, ctx);
  registerBrowserAgentRoutes(app, ctx);
}
