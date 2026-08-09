import { createServerFn } from "@tanstack/react-start";
import { loadAdapter } from "../lib/storage-adapter";
import { getProviderBySlug } from "../lib/providers";
import { decrypt } from "../lib/crypto";

// Server function triggered by cron (Vercel) or manual call
// Polls each supported provider for current usage, saves a UsageSnapshot
export const pollUsage = createServerFn({ method: "POST" })
  .handler(async () => {
    const adapter = await loadAdapter();
    const tokens = await adapter.getTokens();
    const results: Array<{ tokenId: string; provider: string; success: boolean; error?: string }> = [];

    for (const token of tokens) {
      const providerAdapter = getProviderBySlug(token.provider);
      if (!providerAdapter) {
        results.push({ tokenId: token.id, provider: token.provider, success: false, error: "Provider not supported" });
        continue;
      }

      try {
        const usage = await providerAdapter.fetchUsage({
          apiKey: decrypt(token.encryptedValue),
          publicKey: token.publicKey ? decrypt(token.publicKey) : null,
          trackingKey: token.trackingKey ? decrypt(token.trackingKey) : null,
          baseUrl: token.baseUrl ?? null,
        });

        if (usage.tokensUsed > 0 || usage.cost > 0) {
          if (usage.daily && usage.daily.length > 0) {
            for (const d of usage.daily) {
              await adapter.addSnapshot(token.id, {
                tokensUsed: d.tokensUsed,
                cost: d.cost,
                model: d.model ?? null,
                provider: token.provider,
                timestamp: d.timestamp,
              });
            }
          } else {
            await adapter.addSnapshot(token.id, {
              tokensUsed: usage.tokensUsed,
              cost: usage.cost,
              model: null,
              provider: token.provider,
            });
          }
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