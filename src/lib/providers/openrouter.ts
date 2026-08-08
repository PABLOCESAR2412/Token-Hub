import type { ProviderAdapter, ProviderUsage } from "./index";

// OpenRouter - real usage & credits via /api/v1/key and per-model via /api/v1/activity
// Docs: https://openrouter.ai/docs/api-reference/api-keys/get-current-api-key
export const openRouterProvider: ProviderAdapter = {
  name: "OpenRouter",
  slug: "openrouter",
  fetchUsage: async (apiKey: string): Promise<ProviderUsage> => {
    const base = "https://openrouter.ai/api/v1";

    try {
      // 1) Credits / usage for the key (works with a normal sk-or-v1 key).
      const keyRes = await fetch(`${base}/key`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!keyRes.ok) {
        return { tokensUsed: 0, cost: 0, raw: { status: keyRes.status, statusText: keyRes.statusText } };
      }
      const keyData = (await keyRes.json()).data;
      const usage = keyData.usage ?? 0; // credits used (all time)
      const limitRemaining = keyData.limit_remaining ?? null;
      const limit = keyData.limit ?? null;
      const daily = keyData.usage_daily ?? 0;
      const weekly = keyData.usage_weekly ?? 0;
      const monthly = keyData.usage_monthly ?? 0;
      const tokensUsed = Math.round(usage * 1000); // approximate: credits ~ USD; tokens not exposed directly
      const cost = usage;

      // 2) Per-model activity (requires a management key; graceful fallback).
      let models: ProviderUsage["models"] = [];
      try {
        const actRes = await fetch(`${base}/activity?date=${new Date().toISOString().slice(0, 10)}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (actRes.ok) {
          const actData = await actRes.json();
          if (Array.isArray(actData.data)) {
            const byModel = new Map<string, any>();
            for (const item of actData.data) {
              const m = byModel.get(item.model) || {
                model: item.model,
                tokensUsed: 0,
                cost: 0,
                inputTokens: 0,
                outputTokens: 0,
              };
              m.cost += item.usage ?? 0;
              m.inputTokens = (m.inputTokens ?? 0) + (item.prompt_tokens ?? 0);
              m.outputTokens = (m.outputTokens ?? 0) + (item.completion_tokens ?? 0);
              m.tokensUsed = (m.inputTokens ?? 0) + (m.outputTokens ?? 0);
              byModel.set(item.model, m);
            }
            models = Array.from(byModel.values()).map((m) => ({
              model: m.model,
              tokensUsed: m.tokensUsed,
              cost: m.cost,
              inputTokens: m.inputTokens,
              outputTokens: m.outputTokens,
            }));
          }
        }
      } catch {
        // activity requires management key; keep models = []
      }

      return {
        tokensUsed,
        cost,
        raw: {
          usage,
          daily,
          weekly,
          monthly,
          limit_remaining: limitRemaining,
          limit_reset: keyData.limit_reset ?? null,
          limit,
        },
        models,
      };
    } catch (err: any) {
      return { tokensUsed: 0, cost: 0, raw: { error: err.message } };
    }
  },
};