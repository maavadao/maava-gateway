export * from "./internal-hooks.ts";

export type HookEventType = import("./internal-hooks.ts").InternalHookEventType;
export type HookEvent = import("./internal-hooks.ts").InternalHookEvent;
export type HookHandler = import("./internal-hooks.ts").InternalHookHandler;

export {
  registerInternalHook as registerHook,
  unregisterInternalHook as unregisterHook,
  clearInternalHooks as clearHooks,
  getRegisteredEventKeys as getRegisteredHookEventKeys,
  triggerInternalHook as triggerHook,
  createInternalHookEvent as createHookEvent,
} from "./internal-hooks.ts";
