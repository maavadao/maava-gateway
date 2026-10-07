import type { OpenClawConfig } from "../../../config/config.ts";
import type { OnboardOptions } from "../../onboard-types.ts";
import { resolveUserPath } from "../../../utils.ts";

export function resolveNonInteractiveWorkspaceDir(params: {
  opts: OnboardOptions;
  baseConfig: OpenClawConfig;
  defaultWorkspaceDir: string;
}) {
  const raw = (
    params.opts.workspace ??
    params.baseConfig.agents?.defaults?.workspace ??
    params.defaultWorkspaceDir
  ).trim();
  return resolveUserPath(raw);
}
