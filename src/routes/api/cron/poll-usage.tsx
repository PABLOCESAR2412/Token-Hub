import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { loadAdapter } from "../../../lib/storage-adapter";
import { getProviderBySlug } from "../../../lib/providers";
import { decrypt } from "../../../lib/crypto";

// Verifies CRON_SECRET to prevent unauthorized access
export const Route = createFileRoute("/api/cron/poll-usage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
          return json({ error: "Unauthorized" }, { status: 401 });
        }

        const adapter = await loadAdapter();
        const tokens = await adapter.getTokens();

        const results: Array<{ tokenId: string; provider: string; success: boolean; error?: string }> = [];

        for (const token of tokens) {
          const providerAdapter = getProviderBySlug(token.provider);
          if (!providerAdapter) {
            results.push({ tokenId: token.id, provider: token.provider, success: false, error: "Provider not supported" });
            continue;
          }

          if (!token.active) {
            results.push({ tokenId: token.id, provider: token.provider, success: false, error: "Token paused" });
            continue;
          }

          try {
            const usage = await providerAdapter.fetchUsage({
              apiKey: decrypt(token.encryptedValue),
              publicKey: token.publicKey ? decrypt(token.publicKey) : null,
              trackingKey: token.trackingKey ? decrypt(token.trackingKey) : null,
              baseUrl: token.baseUrl ?? null,
            });
            if (usage.tokensUsed > 0 || usage.cost > 0 || (usage.daily && usage.daily.length > 0)) {
              if (usage.models && usage.models.length > 0) {
                // Providers may expose per-model breakdown; store one snapshot per model.
                for (const m of usage.models) {
                  await adapter.addSnapshot(token.id, {
                    tokensUsed: m.tokensUsed,
                    cost: m.cost,
                    model: m.model ?? null,
                    inputTokens: m.inputTokens ?? 0,
                    outputTokens: m.outputTokens ?? 0,
                    latencyMs: m.latencyMs ?? null,
                    tokensPerSecond: m.tokensPerSecond ?? null,
                    provider: token.provider,
                    timestamp: new Date().toISOString(),
                  });
                }
              } else if (usage.daily && usage.daily.length > 0) {
                // Providers may return per-day detail; store one snapshot per day.
                for (const d of usage.daily) {
                  await adapter.addSnapshot(token.id, {
                    tokensUsed: d.tokensUsed,
                    cost: d.cost,
                    model: d.model ?? null,
                    inputTokens: 0,
                    outputTokens: 0,
                    latencyMs: null,
                    tokensPerSecond: null,
                    provider: token.provider,
                    timestamp: d.timestamp,
                  });
                }
              } else {
                // Fallback: a single snapshot covering the reported window.
                await adapter.addSnapshot(token.id, {
                  tokensUsed: usage.tokensUsed,
                  cost: usage.cost,
                  model: null,
                  inputTokens: 0,
                  outputTokens: 0,
                  latencyMs: null,
                  tokensPerSecond: null,
                  provider: token.provider,
                });
              }

              // Gatekeeper: auto-pause a token that blew its monthly cap.
              if (typeof token.maxUsd === "number" && token.maxUsd > 0 && token.totalCost + usage.cost > token.maxUsd) {
                try {
                  await adapter.setTokenActive(token.id, false);
                  await adapter.addAudit({
                    tokenId: token.id,
                    tokenName: token.name,
                    action: "cap_exceeded",
                    detail: `// Cap $${token.maxUsd.toFixed(2)} superado`,
                  });
                } catch (e: any) {
                  results.push({ tokenId: token.id, provider: token.provider, success: false, error: `Cap check: ${e.message}` });
                }
              }
              results.push({ tokenId: token.id, provider: token.provider, success: true });
            } else {
              results.push({ tokenId: token.id, provider: token.provider, success: false, error: "No usage data" });
            }
          } catch (err: any) {
            results.push({ tokenId: token.id, provider: token.provider, success: false, error: err.message });
          }
        }

        return json({ timestamp: new Date().toISOString(), results });
      },
    },
  },
});