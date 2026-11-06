import { createFileRoute } from "@tanstack/react-router";
import { isAuthorized, isRecoverySession } from "../../lib/auth";
import { loadAdapter } from "../../lib/storage-adapter";
import { getUnifiedModelGroups } from "../../lib/proxy/model-groups";

const SNAPSHOT_LIMIT_PER_TOKEN = 300;

function isTokenAvailable(token: { active: boolean; maxUsd?: number | null; totalCost: number }): boolean {
  return token.active && !(typeof token.maxUsd === "number" && token.maxUsd > 0 && token.totalCost >= token.maxUsd);
}

function normalizeModelId(model: string | null | undefined): string {
  return model?.trim().toLowerCase() ?? "";
}

export const Route = createFileRoute("/api/gateway-model-usage")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthorized(request) || isRecoverySession(request)) {
          return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
        }

        try {
          const adapter = await loadAdapter();
          const tokens = await adapter.getTokens();
          const groups = getUnifiedModelGroups(tokens, true);
          const tokenIds = [...new Set(groups.flatMap((group) => group.routes.map((route) => route.token.id)))];
          const snapshotResults = await Promise.all(
            tokenIds.map(async (tokenId) => {
              try {
                return { tokenId, snapshots: await adapter.getSnapshots(tokenId), failed: false };
              } catch {
                return { tokenId, snapshots: [], failed: true };
              }
            })
          );
          const snapshotsByToken = new Map(snapshotResults.map((result) => [result.tokenId, result.snapshots]));
          const failedSnapshotReads = snapshotResults.filter((result) => result.failed).length;
          const truncatedTokens = snapshotResults.filter((result) => result.snapshots.length >= SNAPSHOT_LIMIT_PER_TOKEN).length;

          const models = groups.map((group) => {
            const providers = new Map<string, {
              provider: string;
              keys: number;
              activeKeys: number;
              requests: number;
              inputTokens: number;
              outputTokens: number;
              tokensUsed: number;
              estimatedCost: number;
              lastUsedAt: string | null;
            }>();

            for (const route of group.routes) {
              const providerName = route.token.provider;
              const row = providers.get(providerName) ?? {
                provider: providerName,
                keys: 0,
                activeKeys: 0,
                requests: 0,
                inputTokens: 0,
                outputTokens: 0,
                tokensUsed: 0,
                estimatedCost: 0,
                lastUsedAt: null,
              };
              row.keys += 1;
              if (isTokenAvailable(route.token)) row.activeKeys += 1;

              const matchingSnapshots = (snapshotsByToken.get(route.token.id) ?? []).filter(
                (snapshot) => normalizeModelId(snapshot.model) === normalizeModelId(route.upstreamModel)
              );
              for (const snapshot of matchingSnapshots) {
                row.requests += 1;
                row.inputTokens += snapshot.inputTokens ?? 0;
                row.outputTokens += snapshot.outputTokens ?? 0;
                row.tokensUsed += snapshot.tokensUsed ?? 0;
                row.estimatedCost += snapshot.cost ?? 0;
                if (!row.lastUsedAt || snapshot.timestamp > row.lastUsedAt) row.lastUsedAt = snapshot.timestamp;
              }
              providers.set(providerName, row);
            }

            const providerRows = [...providers.values()].sort((a, b) => a.provider.localeCompare(b.provider));
            const totals = providerRows.reduce(
              (sum, provider) => ({
                keys: sum.keys + provider.keys,
                activeKeys: sum.activeKeys + provider.activeKeys,
                requests: sum.requests + provider.requests,
                inputTokens: sum.inputTokens + provider.inputTokens,
                outputTokens: sum.outputTokens + provider.outputTokens,
                tokensUsed: sum.tokensUsed + provider.tokensUsed,
                estimatedCost: sum.estimatedCost + provider.estimatedCost,
                lastUsedAt:
                  !sum.lastUsedAt || (provider.lastUsedAt && provider.lastUsedAt > sum.lastUsedAt)
                    ? provider.lastUsedAt
                    : sum.lastUsedAt,
              }),
              {
                keys: 0,
                activeKeys: 0,
                requests: 0,
                inputTokens: 0,
                outputTokens: 0,
                tokensUsed: 0,
                estimatedCost: 0,
                lastUsedAt: null as string | null,
              }
            );

            return {
              id: group.id,
              name: group.name,
              upstreamModel: group.routes[0]?.upstreamModel ?? group.name,
              providers: providerRows,
              totals,
            };
          });

          return Response.json(
            { models, truncatedTokens, failedSnapshotReads, snapshotLimitPerToken: SNAPSHOT_LIMIT_PER_TOKEN },
            { headers: { "Cache-Control": "no-store" } }
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "No se pudo cargar el uso por modelo.";
          return Response.json({ error: message }, { status: 500, headers: { "Cache-Control": "no-store" } });
        }
      },
    },
  },
});
