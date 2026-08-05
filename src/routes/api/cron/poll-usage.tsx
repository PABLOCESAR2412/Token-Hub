import { createServerFileRoute } from "@tanstack/react-start/server";
import { json } from "@tanstack/react-start";
import { loadAdapter } from "../../../lib/storage-adapter";
import { providers } from "../../../lib/providers";

// Vercel cron calls this endpoint every 6 hours
// Verifies CRON_SECRET to prevent unauthorized access
export const ServerRoute = createServerFileRoute("/api/cron/poll-usage").methods({
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
      const providerAdapter = providers.find((p) => p.slug === token.provider);
      if (!providerAdapter) {
        results.push({ tokenId: token.id, provider: token.provider, success: false, error: "Provider not supported" });
        continue;
      }

      try {
        const usage = await providerAdapter.fetchUsage(token.encryptedValue);
        if (usage.tokensUsed > 0 || usage.cost > 0) {
          await adapter.addSnapshot(token.id, usage.tokensUsed, usage.cost);
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
});
