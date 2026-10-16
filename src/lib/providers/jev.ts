import type { ProviderAdapter, ProviderUsage, ProviderContext } from "./index";

/**
 * JEV (TypeSafe AI) Adapter
 * System-One Decision Engine & Ultra-fast Classifier (<5ms latency)
 * Accessible natively via TypeSafe AI (https://api.typesafe.ai/v1) or OpenRouter (typesafe/jev-latest)
 */
export const jevProvider: ProviderAdapter = {
  name: "JEV (TypeSafe AI)",
  slug: "jev",
  fetchUsage: async ({ apiKey, baseUrl }: ProviderContext): Promise<ProviderUsage> => {
    try {
      if (!apiKey || apiKey === "probe-for-health-check-only") {
        return {
          tokensUsed: 0,
          cost: 0,
          raw: { status: 400, statusText: "API Key requerida para verificar JEV (TypeSafe AI)" },
        };
      }

      const isOpenRouterKey = apiKey.startsWith("sk-or-v1-") || apiKey.startsWith("sk-or-");
      const endpoint = baseUrl
        ? baseUrl.replace(/\/+$/, "")
        : isOpenRouterKey
        ? "https://openrouter.ai/api/v1"
        : "https://api.typesafe.ai/v1";

      let modelsCount = 3;
      let limitRemaining: string | number | null = null;
      let totalUsage = 0;

      if (isOpenRouterKey) {
        try {
          const keyRes = await fetch("https://openrouter.ai/api/v1/key", {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (keyRes.ok) {
            const kd = (await keyRes.json())?.data || {};
            totalUsage = kd.usage || 0;
            limitRemaining = kd.limit_remaining;
          }
        } catch {}
      } else {
        try {
          const modRes = await fetch(`${endpoint}/models`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (modRes.ok) {
            const modData = await modRes.json();
            if (Array.isArray(modData?.data)) {
              modelsCount = modData.data.length;
            }
          }
        } catch {}
      }

      return {
        tokensUsed: Math.round(totalUsage * 1000),
        cost: totalUsage,
        raw: {
          ok: true,
          provider: "JEV (TypeSafe AI)",
          architecture: "System-One Decision Engine (<5ms Latency)",
          pricing: "$0.042 por 1M tokens de entrada (0 costo en output)",
          modelsCount,
          endpoint,
          limitRemaining,
        },
        models: [
          {
            model: "typesafe/jev-latest",
            tokensUsed: 0,
            cost: 0,
          },
          {
            model: "typesafe/jev-1.14",
            tokensUsed: 0,
            cost: 0,
          },
          {
            model: "typesafe/jev-router",
            tokensUsed: 0,
            cost: 0,
          },
        ],
      };
    } catch (err: any) {
      return { tokensUsed: 0, cost: 0, raw: { error: err.message } };
    }
  },
};
