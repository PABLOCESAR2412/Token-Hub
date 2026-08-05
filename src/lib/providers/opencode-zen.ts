import type { ProviderAdapter, ProviderUsage } from "./index";

// OpenCode Zen - simulated provider for demo/dev use
// In production, replace with real API endpoint
export const opencodeZenProvider: ProviderAdapter = {
  name: "OpenCode Zen",
  slug: "opencode-zen",
  fetchUsage: async (apiKey: string): Promise<ProviderUsage> => {
    try {
      // Simulated usage - in production, call the real API
      // For now, return random usage data that changes over time
      const now = Date.now();
      const dayOfYear = Math.floor(now / 86400000);
      const tokensUsed = 100 + (dayOfYear % 30) * 50;
      const cost = +(0.5 + (dayOfYear % 30) * 0.1).toFixed(2);

      return {
        tokensUsed,
        cost,
        raw: { simulated: true, note: "Replace with real OpenCode Zen API" },
      };
    } catch (err: any) {
      return { tokensUsed: 0, cost: 0, raw: { error: err.message } };
    }
  },
};
