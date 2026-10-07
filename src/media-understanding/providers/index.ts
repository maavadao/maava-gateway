import type { MediaUnderstandingProvider } from "../types.ts";
import { normalizeProviderId } from "../../agents/model-selection.ts";
import { anthropicProvider } from "./anthropic/index.ts";
import { deepgramProvider } from "./deepgram/index.ts";
import { googleProvider } from "./google/index.ts";
import { groqProvider } from "./groq/index.ts";
import { minimaxProvider } from "./minimax/index.ts";
import { openaiProvider } from "./openai/index.ts";

const PROVIDERS: MediaUnderstandingProvider[] = [
  groqProvider,
  openaiProvider,
  googleProvider,
  anthropicProvider,
  minimaxProvider,
  deepgramProvider,
];

export function normalizeMediaProviderId(id: string): string {
  const normalized = normalizeProviderId(id);
  if (normalized === "gemini") {
    return "google";
  }
  return normalized;
}

export function buildMediaUnderstandingRegistry(
  overrides?: Record<string, MediaUnderstandingProvider>,
): Map<string, MediaUnderstandingProvider> {
  const registry = new Map<string, MediaUnderstandingProvider>();
  for (const provider of PROVIDERS) {
    registry.set(normalizeMediaProviderId(provider.id), provider);
  }
  if (overrides) {
    for (const [key, provider] of Object.entries(overrides)) {
      const normalizedKey = normalizeMediaProviderId(key);
      const existing = registry.get(normalizedKey);
      const merged = existing
        ? {
            ...existing,
            ...provider,
            capabilities: provider.capabilities ?? existing.capabilities,
          }
        : provider;
      registry.set(normalizedKey, merged);
    }
  }
  return registry;
}

export function getMediaUnderstandingProvider(
  id: string,
  registry: Map<string, MediaUnderstandingProvider>,
): MediaUnderstandingProvider | undefined {
  return registry.get(normalizeMediaProviderId(id));
}
