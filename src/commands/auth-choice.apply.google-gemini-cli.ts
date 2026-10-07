import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.ts";
import { applyAuthChoicePluginProvider } from "./auth-choice.apply.plugin-provider.ts";

export async function applyAuthChoiceGoogleGeminiCli(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult | null> {
  return await applyAuthChoicePluginProvider(params, {
    authChoice: "google-gemini-cli",
    pluginId: "google-gemini-cli-auth",
    providerId: "google-gemini-cli",
    methodId: "oauth",
    label: "Google Gemini CLI",
  });
}
