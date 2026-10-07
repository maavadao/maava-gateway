import type { OpenClawConfig } from "../config/config.ts";
import type { RuntimeEnv } from "../runtime.ts";
import type { WizardPrompter } from "../wizard/prompts.ts";
import type { AuthChoice } from "./onboard-types.ts";
import { applyAuthChoiceAnthropic } from "./auth-choice.apply.anthropic.ts";
import { applyAuthChoiceApiProviders } from "./auth-choice.apply.api-providers.ts";
import { applyAuthChoiceCopilotProxy } from "./auth-choice.apply.copilot-proxy.ts";
import { applyAuthChoiceGitHubCopilot } from "./auth-choice.apply.github-copilot.ts";
import { applyAuthChoiceGoogleAntigravity } from "./auth-choice.apply.google-antigravity.ts";
import { applyAuthChoiceGoogleGeminiCli } from "./auth-choice.apply.google-gemini-cli.ts";
import { applyAuthChoiceMiniMax } from "./auth-choice.apply.minimax.ts";
import { applyAuthChoiceOAuth } from "./auth-choice.apply.oauth.ts";
import { applyAuthChoiceOpenAI } from "./auth-choice.apply.openai.ts";
import { applyAuthChoiceQwenPortal } from "./auth-choice.apply.qwen-portal.ts";

export type ApplyAuthChoiceParams = {
  authChoice: AuthChoice;
  config: OpenClawConfig;
  prompter: WizardPrompter;
  runtime: RuntimeEnv;
  agentDir?: string;
  setDefaultModel: boolean;
  agentId?: string;
  opts?: {
    tokenProvider?: string;
    token?: string;
  };
};

export type ApplyAuthChoiceResult = {
  config: OpenClawConfig;
  agentModelOverride?: string;
};

export async function applyAuthChoice(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult> {
  const handlers: Array<(p: ApplyAuthChoiceParams) => Promise<ApplyAuthChoiceResult | null>> = [
    applyAuthChoiceAnthropic,
    applyAuthChoiceOpenAI,
    applyAuthChoiceOAuth,
    applyAuthChoiceApiProviders,
    applyAuthChoiceMiniMax,
    applyAuthChoiceGitHubCopilot,
    applyAuthChoiceGoogleAntigravity,
    applyAuthChoiceGoogleGeminiCli,
    applyAuthChoiceCopilotProxy,
    applyAuthChoiceQwenPortal,
  ];

  for (const handler of handlers) {
    const result = await handler(params);
    if (result) {
      return result;
    }
  }

  return { config: params.config };
}
