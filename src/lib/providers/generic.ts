import type { ProviderAdapter, ProviderUsage } from "./index";

export interface StaticProviderOptions {
  name: string;
  slug: string;
  note?: string;
}

/**
 * Fallback adapter for providers without a public usage/credits endpoint.
 * Polling logs "No usage data" instead of crashing.
 */
export function makeStaticProvider(opts: StaticProviderOptions): ProviderAdapter {
  const { name, slug } = opts;
  return {
    name,
    slug,
    fetchUsage: async (): Promise<ProviderUsage> => ({
      tokensUsed: 0,
      cost: 0,
      raw: { note: opts.note || "No public usage endpoint", simulated: true },
    }),
  };
}