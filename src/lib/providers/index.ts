import { googleProvider } from "./google";
import { nvidiaProvider } from "./nvidia";
import { opencodeZenProvider } from "./opencode-zen";
import { openRouterProvider } from "./openrouter";

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
}

export interface ProviderAdapter {
  name: string;
  slug: string;
  fetchUsage: (apiKey: string) => Promise<ProviderUsage>;
}

export const providers: ProviderAdapter[] = [
  googleProvider,
  nvidiaProvider,
  opencodeZenProvider,
  openRouterProvider,
];
