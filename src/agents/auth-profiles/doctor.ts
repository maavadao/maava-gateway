import type { OpenClawConfig } from "../../config/config.ts";
import type { AuthProfileStore } from "./types.ts";
import { formatCliCommand } from "../../cli/command-format.ts";
import { normalizeProviderId } from "../model-selection.ts";
import { listProfilesForProvider } from "./profiles.ts";
import { suggestOAuthProfileIdForLegacyDefault } from "./repair.ts";

export function formatAuthDoctorHint(params: {
  cfg?: OpenClawConfig;
  store: AuthProfileStore;
  provider: string;
  profileId?: string;
}): string {
  const providerKey = normalizeProviderId(params.provider);
  if (providerKey !== "anthropic") {
    return "";
  }

  const legacyProfileId = params.profileId ?? "anthropic:default";
  const suggested = suggestOAuthProfileIdForLegacyDefault({
    cfg: params.cfg,
    store: params.store,
    provider: providerKey,
    legacyProfileId,
  });
  if (!suggested || suggested === legacyProfileId) {
    return "";
  }

  const storeOauthProfiles = listProfilesForProvider(params.store, providerKey)
    .filter((id) => params.store.profiles[id]?.type === "oauth")
    .join(", ");

  const cfgMode = params.cfg?.auth?.profiles?.[legacyProfileId]?.mode;
  const cfgProvider = params.cfg?.auth?.profiles?.[legacyProfileId]?.provider;

  return [
    "Doctor hint (for GitHub issue):",
    `- provider: ${providerKey}`,
    `- config: ${legacyProfileId}${
      cfgProvider || cfgMode ? ` (provider=${cfgProvider ?? "?"}, mode=${cfgMode ?? "?"})` : ""
    }`,
    `- auth store oauth profiles: ${storeOauthProfiles || "(none)"}`,
    `- suggested profile: ${suggested}`,
    `Fix: run "${formatCliCommand("openclaw doctor --yes")}"`,
  ].join("\n");
}
