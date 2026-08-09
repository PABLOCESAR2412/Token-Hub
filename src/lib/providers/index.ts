import { PROVIDER_CATALOG } from "./catalog";
import { googleProvider } from "./google";
import { nvidiaProvider } from "./nvidia";
import { opencodeZenProvider } from "./opencode-zen";
import { openRouterProvider } from "./openrouter";
import { langfuseProvider } from "./langfuse";
import { makeStaticProvider } from "./generic";

export interface ModelUsage {
  model: string | null;
  tokensUsed: number;
  cost: number;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number | null;
  tokensPerSecond?: number | null;
}

export interface ProviderUsage {
  tokensUsed: number;
  cost: number;
  raw?: Record<string, unknown>;
  models?: ModelUsage[];
  daily?: Array<{ timestamp: string; tokensUsed: number; cost: number; model?: string | null }>;
}

export interface ProviderContext {
  apiKey: string;
  publicKey?: string | null;
  trackingKey?: string | null;
  baseUrl?: string | null;
}

export interface ProviderAdapter {
  name: string;
  slug: string;
  fetchUsage: (ctx: ProviderContext) => Promise<ProviderUsage>;
}

const realAdapters: ProviderAdapter[] = [
  openRouterProvider,
  googleProvider,
  nvidiaProvider,
  opencodeZenProvider,
  langfuseProvider,
];

// Providers without a public usage endpoint get a graceful fallback adapter.
const staticProviders = PROVIDER_CATALOG.filter(
  (p) => !realAdapters.some((a) => a.slug === p.slug)
).map((p) => makeStaticProvider({ name: p.label, slug: p.slug }));

export const providers: ProviderAdapter[] = [...realAdapters, ...staticProviders];

export function getProviderBySlug(slug: string): ProviderAdapter | undefined {
  return providers.find((p) => p.slug === slug || p.name.toLowerCase() === slug.toLowerCase());
}