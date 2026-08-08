import { createServerFn } from "@tanstack/react-start";
import { loadAdapter } from "../lib/storage-adapter";
import { providers } from "../lib/providers";

// Server function triggered by cron (Vercel) or manual call
// Polls each supported provider for current usage, saves a UsageSnapshot
export const pollUsage = createServerFn({ method: "POST" })
  .handler(async () => {
    const adapter = await loadAdapter();
    const tokens = await adapter.getTokens();
    const results: Array<{ tokenId: string; provider: string; success: boolean; error?: string }> = [];

    for (const token of tokens) {
      const providerAdapter = providers.find((p) => p.slug === token.provider);
      if (!providerAdapter) {
        results.push({ tokenId: token.id, provider: token.provider, success: false, error: "Provider not supported" });
        continue;
      }

      try {
        const usage = await providerAdapter.fetchUsage(token.encryptedValue);
        if (usage.tokensUsed > 0 || usage.cost > 0) {
          await adapter.addSnapshot(token.id, {
            tokensUsed: usage.tokensUsed,
            cost: usage.cost,
            model: null,
          });
          results.push({ tokenId: token.id, provider: token.provider, success: true });
        } else {
          results.push({ tokenId: token.id, provider: token.provider, success: false, error: "No usage data" });
        }
      } catch (err: any) {
        results.push({ tokenId: token.id, provider: token.provider, success: false, error: err.message });
      }
    }

    return { timestamp: new Date().toISOString(), results };
  });
