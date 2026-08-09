import type { ProviderAdapter, ProviderUsage, ProviderContext } from "./index";

// Langfuse - observability & LLM tracing platform
// Docs: https://langfuse.com/docs/metrics/features/metrics-api
//
// Auth is HTTP Basic: username=publicKey (pk-lf-...), password=secretKey (sk-lf-...)
//   LANGFUSE_SECRET_KEY="sk-lf-..."
//   LANGFUSE_PUBLIC_KEY="pk-lf-..."
//   LANGFUSE_BASE_URL="https://cloud.langfuse.com"
//
// Store the SECRET key in the token's apiKey, the PUBLIC key in publicKey,
// and the base URL in baseUrl (optional, defaults to cloud.langfuse.com).

const DEFAULT_BASE = "https://cloud.langfuse.com";

async function queryMetrics(ctx: ProviderContext, from: string, to: string): Promise<ProviderUsage> {
  const base = (ctx.baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
  const publicKey = ctx.publicKey || "";
  const secretKey = ctx.apiKey;

  if (!publicKey || !secretKey) {
    return { tokensUsed: 0, cost: 0, raw: { error: "publicKey (pk) o apiKey (sk) faltantes" } };
  }

  const query = {
    view: "observations",
    metrics: [
      { measure: "totalTokens", aggregation: "sum" },
      { measure: "totalCost", aggregation: "sum" },
    ],
    dimensions: [{ field: "providedModelName" }],
    timeDimension: { granularity: "day" },
    filters: [],
    fromTimestamp: from,
    toTimestamp: to,
    config: { row_limit: 1000 },
  };

  const res = await fetch(`${base}/api/public/v2/metrics?query=${encodeURIComponent(JSON.stringify(query))}`, {
    headers: {
      Authorization: "Basic " + btoa(`${publicKey}:${secretKey}`),
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    return { tokensUsed: 0, cost: 0, raw: { status: res.status, statusText: res.statusText } };
  }

  const json = (await res.json()) as any;
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];

  const byDay = new Map<string, { tokensUsed: number; cost: number }>();
  const byModel = new Map<string, { model: string; tokensUsed: number; cost: number }>();

  for (const row of rows) {
    const day: string = String(row.time_dimension ?? "").slice(0, 10);
    if (day) {
      const cur = byDay.get(day) || { tokensUsed: 0, cost: 0 };
      cur.tokensUsed += Number(row.totalTokens ?? 0);
      cur.cost += Number(row.totalCost ?? 0);
      byDay.set(day, cur);
    }

    const model = String(row.providedModelName ?? "unknown");
    const m = byModel.get(model) || { model, tokensUsed: 0, cost: 0 };
    m.tokensUsed += Number(row.totalTokens ?? 0);
    m.cost += Number(row.totalCost ?? 0);
    byModel.set(model, m);
  }

  const daily = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([timestamp, v]) => ({ timestamp, tokensUsed: v.tokensUsed, cost: v.cost, model: null }));

  const models = Array.from(byModel.values()).filter((m) => m.tokensUsed > 0 || m.cost > 0);

  return {
    tokensUsed: daily.reduce((a, d) => a + d.tokensUsed, 0),
    cost: daily.reduce((a, d) => a + d.cost, 0),
    daily,
    models,
    raw: { rows: rows.length },
  };
}

export const langfuseProvider: ProviderAdapter = {
  name: "Langfuse",
  slug: "langfuse",
  fetchUsage: async (ctx: ProviderContext): Promise<ProviderUsage> => {
    try {
      const now = new Date();
      const from = new Date(now.getTime() - 30 * 86400000).toISOString();
      return await queryMetrics(ctx, from, now.toISOString());
    } catch (err: any) {
      return { tokensUsed: 0, cost: 0, raw: { error: err.message } };
    }
  },
};