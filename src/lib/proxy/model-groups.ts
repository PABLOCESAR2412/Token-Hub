import type { Token } from "../types";

export interface UnifiedModelRoute {
  token: Token;
  upstreamModel: string;
}

export interface UnifiedModelGroup {
  id: string;
  name: string;
  routes: UnifiedModelRoute[];
}

function isAvailable(token: Token): boolean {
  return (
    token.active &&
    !(typeof token.maxUsd === "number" && token.maxUsd > 0 && token.totalCost >= token.maxUsd)
  );
}

/**
 * Use the final path segment as a readable public alias. Grouping itself uses
 * the complete upstream ID so similarly named but different models are never
 * merged by guesswork.
 */
export function normalizeModelAlias(model: string): string {
  return model.trim().split("/").filter(Boolean).at(-1)?.toLowerCase() || "";
}

function compareRoutes(a: UnifiedModelRoute, b: UnifiedModelRoute): number {
  const byCreatedAt = a.token.createdAt.localeCompare(b.token.createdAt);
  if (byCreatedAt !== 0) return byCreatedAt;
  return a.token.provider.localeCompare(b.token.provider);
}

export function getUnifiedModelGroups(tokens: Token[], includeUnavailable = false): UnifiedModelGroup[] {
  const byModelId = new Map<string, UnifiedModelRoute[]>();

  for (const token of tokens) {
    if (!includeUnavailable && !isAvailable(token)) continue;

    for (const upstreamModel of new Set(token.selectedModels ?? [])) {
      const modelId = upstreamModel.trim().toLowerCase();
      if (!modelId || !normalizeModelAlias(modelId)) continue;

      const routes = byModelId.get(modelId) ?? [];
      routes.push({ token, upstreamModel });
      byModelId.set(modelId, routes);
    }
  }

  const eligible = [...byModelId.values()]
    .map((routes) => {
      const distinctProviders = new Set(routes.map((route) => route.token.provider.toLowerCase()));
      const name = normalizeModelAlias(routes[0].upstreamModel);
      return { id: `ath/${name}`, name, routes: routes.sort(compareRoutes), distinctProviders };
    })
    .filter((group) => group.distinctProviders.size > 1);

  const aliasCounts = new Map<string, number>();
  for (const group of eligible) aliasCounts.set(group.name, (aliasCounts.get(group.name) ?? 0) + 1);

  return eligible
    .filter((group) => aliasCounts.get(group.name) === 1)
    .map(({ id, name, routes }) => ({ id, name, routes }));
}
