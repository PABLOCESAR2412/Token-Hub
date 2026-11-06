import type { ProviderAdapter, ProviderUsage, ProviderContext } from "./index";

// OpenCode Zen has no implemented usage endpoint. Keep it explicit instead of
// returning fabricated values that could be mistaken for provider telemetry.
export const opencodeZenProvider: ProviderAdapter = {
  name: "OpenCode Zen",
  slug: "opencode-zen",
  fetchUsage: async (_ctx: ProviderContext): Promise<ProviderUsage> => {
    return {
      tokensUsed: 0,
      cost: 0,
      raw: {
        usageSupported: false,
        note: "No usage endpoint is configured for OpenCode Zen.",
      },
    };
  },
};
