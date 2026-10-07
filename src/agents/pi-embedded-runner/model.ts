import type { Api, Model } from "@mariozechner/pi-ai";
import type { OpenClawConfig } from "../../config/config.ts";
import type { ModelDefinitionConfig } from "../../config/types.ts";
import { resolveOpenClawAgentDir } from "../agent-paths.ts";
import { DEFAULT_CONTEXT_TOKENS } from "../defaults.ts";
import { normalizeModelCompat } from "../model-compat.ts";
import { normalizeProviderId } from "../model-selection.ts";
import {
  discoverAuthStorage,
  discoverModels,
  type AuthStorage,
  type ModelRegistry,
} from "../pi-model-discovery.ts";

type InlineModelEntry = ModelDefinitionConfig & { provider: string; baseUrl?: string };
type InlineProviderConfig = {
  baseUrl?: string;
  api?: ModelDefinitionConfig["api"];
  models?: ModelDefinitionConfig[];
};

export function buildInlineProviderModels(
  providers: Record<string, InlineProviderConfig>,
): InlineModelEntry[] {
  return Object.entries(providers).flatMap(([providerId, entry]) => {
    const trimmed = providerId.trim();
    if (!trimmed) {
      return [];
    }
    return (entry?.models ?? []).map((model) => ({
      ...model,
      provider: trimmed,
      baseUrl: entry?.baseUrl,
      api: model.api ?? entry?.api,
    }));
  });
}

export function buildModelAliasLines(cfg?: OpenClawConfig) {
  const models = cfg?.agents?.defaults?.models ?? {};
  const entries: Array<{ alias: string; model: string }> = [];
  for (const [keyRaw, entryRaw] of Object.entries(models)) {
    const model = String(keyRaw ?? "").trim();
    if (!model) {
      continue;
    }
    const alias = String((entryRaw as { alias?: string } | undefined)?.alias ?? "").trim();
    if (!alias) {
      continue;
    }
    entries.push({ alias, model });
  }
  return entries
    .toSorted((a, b) => a.alias.localeCompare(b.alias))
    .map((entry) => `- ${entry.alias}: ${entry.model}`);
}

export function resolveModel(
  provider: string,
  modelId: string,
  agentDir?: string,
  cfg?: OpenClawConfig,
): {
  model?: Model<Api>;
  error?: string;
  authStorage: AuthStorage;
  modelRegistry: ModelRegistry;
} {
  const resolvedAgentDir = agentDir ?? resolveOpenClawAgentDir();
  const authStorage = discoverAuthStorage(resolvedAgentDir);
  const modelRegistry = discoverModels(authStorage, resolvedAgentDir);
  const model = modelRegistry.find(provider, modelId) as Model<Api> | null;
  if (!model) {
    const providers = cfg?.models?.providers ?? {};
    const inlineModels = buildInlineProviderModels(providers);
    const normalizedProvider = normalizeProviderId(provider);
    const inlineMatch = inlineModels.find(
      (entry) => normalizeProviderId(entry.provider) === normalizedProvider && entry.id === modelId,
    );
    if (inlineMatch) {
      const normalized = normalizeModelCompat(inlineMatch as Model<Api>);
      return {
        model: normalized,
        authStorage,
        modelRegistry,
      };
    }
    const providerCfg = providers[provider];
    if (providerCfg || modelId.startsWith("mock-")) {
      const supportsVision = !modelId.startsWith("mock-") && !modelId.includes("text-");
      console.log(`[IMG-DEBUG][model] fallback model: provider=${provider} modelId=${modelId} supportsVision=${supportsVision} api=${providerCfg?.api ?? "openai-responses"}`);
      const fallbackModel: Model<Api> = normalizeModelCompat({
        id: modelId,
        name: modelId,
        api: providerCfg?.api ?? "openai-responses",
        provider,
        baseUrl: providerCfg?.baseUrl,
        reasoning: false,
        input: supportsVision ? ["text", "image"] : ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: providerCfg?.models?.[0]?.contextWindow ?? DEFAULT_CONTEXT_TOKENS,
        maxTokens: providerCfg?.models?.[0]?.maxTokens ?? DEFAULT_CONTEXT_TOKENS,
      } as Model<Api>);
      return { model: fallbackModel, authStorage, modelRegistry };
    }
    return {
      error: `Unknown model: ${provider}/${modelId}`,
      authStorage,
      modelRegistry,
    };
  }
  const resolved = normalizeModelCompat(model);
  // Ensure vision support for models that don't explicitly declare input capabilities.
  // Most modern models support image input but the registry may not list it.
  if (resolved && (!resolved.input || !resolved.input.includes("image"))) {
    const supportsVision = !modelId.startsWith("mock-") && !modelId.includes("text-");
    if (supportsVision) {
      resolved.input = [...(resolved.input ?? ["text"]), "image"];
    }
  }
  console.log(`[IMG-DEBUG][model] registry model: provider=${provider} modelId=${modelId} input=${JSON.stringify(resolved?.input)}`);
  return { model: resolved, authStorage, modelRegistry };
}
