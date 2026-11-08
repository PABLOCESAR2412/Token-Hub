import type { Token } from "../types";
import { decrypt } from "../crypto";

export interface UnifiedModelRoute {
  token: Token;
  upstreamModel: string;
}

export interface UnifiedModelGroup {
  id: string;
  name: string;
  routes: UnifiedModelRoute[];
}

const MODEL_NAMESPACE_PREFIXES = new Set([
  "ai21", "amazon", "anthropic", "cohere", "deepseek", "deepseek-ai",
  "fireworks", "gemini", "google", "groq", "jev", "lmstudio", "meta",
  "meta-llama", "mistral", "mistralai", "models", "moonshot", "moonshotai",
  "nvidia", "ollama", "openai", "opencode", "openrouter", "perplexity", "qwen",
  "together", "typesafe", "xai",
]);
const NON_MODEL_IDS = new Set(["default", "local-model"]);
const OPEN_CODE_ZEN_MODELS_URL = "https://opencode.ai/zen/v1/models";
const MODEL_DISCOVERY_TTL_MS = 60_000;
const modelDiscoveryCache = new Map<string, { models: string[]; expiresAt: number }>();

function isAvailable(token: Token): boolean {
  return (
    token.active &&
    !(typeof token.maxUsd === "number" && token.maxUsd > 0 && token.totalCost >= token.maxUsd)
  );
}

/**
 * Produces a stable comparison key while keeping the exact upstream ID on each
 * route. It removes provider/owner namespaces and harmless ID formatting
 * differences, but preserves meaningful model/version suffixes.
 */
export function normalizeModelAlias(model: string, provider = ""): string {
  let value = model.trim().toLowerCase().replace(/:(free|nitro|floor)$/i, "");
  const parts = value.split("/").filter(Boolean);
  if (!parts.length) return "";

  const providerPrefix = provider.trim().toLowerCase();
  if (providerPrefix && parts[0] === providerPrefix) parts.shift();
  while (parts.length > 1 && MODEL_NAMESPACE_PREFIXES.has(parts[0])) parts.shift();

  return parts
    .join("-")
    .replace(/[._]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-latest$/i, "");
}

export function isRoutableModel(model: string, provider = ""): boolean {
  const alias = normalizeModelAlias(model, provider);
  return Boolean(alias) && !NON_MODEL_IDS.has(alias);
}

export function getProviderModelId(provider: string, model: string): string {
  const cleanProvider = provider.trim().toLowerCase();
  const cleanModel = model.trim();
  return cleanModel.toLowerCase().startsWith(cleanProvider + "/")
    ? cleanModel
    : `${provider}/${cleanModel}`;
}

/**
 * OpenCode Zen exposes the model IDs that can be used with its API key. Keep
 * that list fresh, while falling back to the token's configured plan models
 * if discovery is unavailable.
 */
export async function getTokenModels(token: Token): Promise<string[]> {
  const configuredModels = token.selectedModels ?? [];
  if (!token.active || token.provider.toLowerCase() !== "opencode-zen") return configuredModels;

  const cacheKey = `${token.id}:${token.encryptedValue}`;
  const cached = modelDiscoveryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.models;

  const fallback = configuredModels.filter((model) => isRoutableModel(model, token.provider));
  try {
    const apiKey = decrypt(token.encryptedValue);
    const baseUrl = token.baseUrl?.trim().replace(/\/+$/, "");
    const modelsUrl = baseUrl ? `${baseUrl}/models` : OPEN_CODE_ZEN_MODELS_URL;
    const response = await fetch(modelsUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      modelDiscoveryCache.set(cacheKey, { models: fallback, expiresAt: Date.now() + 10_000 });
      return fallback;
    }

    const body = await response.json();
    const records = Array.isArray(body?.data) ? body.data : Array.isArray(body?.models) ? body.models : [];
    const discovered = [...new Set(records
      .map((record: any) => typeof record?.id === "string" ? record.id.trim() : "")
      .filter((model: string) => model && isRoutableModel(model, token.provider)))];
    const models = discovered.length ? discovered : fallback;
    modelDiscoveryCache.set(cacheKey, { models, expiresAt: Date.now() + MODEL_DISCOVERY_TTL_MS });
    return models;
  } catch {
    modelDiscoveryCache.set(cacheKey, { models: fallback, expiresAt: Date.now() + 10_000 });
    return fallback;
  }
}

export async function getTokensWithDiscoveredModels(tokens: Token[]): Promise<Token[]> {
  return Promise.all(tokens.map(async (token) => ({
    ...token,
    selectedModels: await getTokenModels(token),
  })));
}

function compareRoutes(a: UnifiedModelRoute, b: UnifiedModelRoute): number {
  const byCreatedAt = a.token.createdAt.localeCompare(b.token.createdAt);
  if (byCreatedAt !== 0) return byCreatedAt;
  return a.token.provider.localeCompare(b.token.provider);
}

export function getUnifiedModelGroups(tokens: Token[], includeUnavailable = false): UnifiedModelGroup[] {
  const byModelId = new Map<string, UnifiedModelRoute[]>();

  for (const token of tokens) {
    if (!includeUnavailable && !isAvailable(token)) continue;

    for (const upstreamModel of new Set(token.selectedModels ?? [])) {
      if (!isRoutableModel(upstreamModel, token.provider)) continue;
      const modelId = normalizeModelAlias(upstreamModel, token.provider);
      const routes = byModelId.get(modelId) ?? [];
      if (!routes.some((route) => route.token.id === token.id && route.upstreamModel === upstreamModel)) {
        routes.push({ token, upstreamModel: upstreamModel.trim() });
      }
      byModelId.set(modelId, routes);
    }
  }

  return [...byModelId.entries()]
    .map(([name, routes]) => ({
      id: `ath/${name}`,
      name,
      routes: routes.sort(compareRoutes),
      distinctProviders: new Set(routes.map((route) => route.token.provider.toLowerCase())),
    }))
    .filter((group) => group.distinctProviders.size > 1)
    .map(({ id, name, routes }) => ({ id, name, routes }));
}
