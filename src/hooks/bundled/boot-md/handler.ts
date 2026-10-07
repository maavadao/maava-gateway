import type { CliDeps } from "../../../cli/deps.ts";
import type { OpenClawConfig } from "../../../config/config.ts";
import type { HookHandler } from "../../hooks.ts";
import { createDefaultDeps } from "../../../cli/deps.ts";
import { runBootOnce } from "../../../gateway/boot.ts";

type BootHookContext = {
  cfg?: OpenClawConfig;
  workspaceDir?: string;
  deps?: CliDeps;
};

const runBootChecklist: HookHandler = async (event) => {
  if (event.type !== "gateway" || event.action !== "startup") {
    return;
  }

  const context = (event.context ?? {}) as BootHookContext;
  if (!context.cfg || !context.workspaceDir) {
    return;
  }

  const deps = context.deps ?? createDefaultDeps();
  await runBootOnce({ cfg: context.cfg, deps, workspaceDir: context.workspaceDir });
};

export default runBootChecklist;
