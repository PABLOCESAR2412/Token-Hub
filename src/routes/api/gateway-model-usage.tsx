import { createFileRoute } from "@tanstack/react-router";
import { isAuthorized, isRecoverySession } from "../../lib/auth";
import { loadAdapter } from "../../lib/storage-adapter";
import { getTokensWithDiscoveredModels, getUnifiedModelGroups } from "../../lib/proxy/model-groups";
import { listGatewayApiKeys } from "../../lib/gateway-keys";

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
          const tokens = await getTokensWithDiscoveredModels(await adapter.getTokens());
          const groups = getUnifiedModelGroups(tokens, true);
          const tokenIds = [...new Set(tokens.map((token) => token.id))];
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

          type ClientModelUsage = {
            model: string;
            requests: number;
            inputTokens: number;
            outputTokens: number;
            tokensUsed: number;
            estimatedCost: number;
            lastUsedAt: string | null;
          };
          const clientKeys = new Map<string, { id: string; name: string; models: Map<string, ClientModelUsage> }>();

          for (const result of snapshotResults) {
            for (const snapshot of result.snapshots) {
              const marker = snapshot.caller?.match(/^\[gateway-key:([^:\]]+):([^\]]+)\]/);
              if (!marker) continue;
              let name = marker[2];
              try { name = decodeURIComponent(name); } catch {}

              const client = clientKeys.get(marker[1]) ?? {
                id: marker[1],
                name,
                models: new Map<string, ClientModelUsage>(),
              };
              const model = snapshot.model || "unknown";
              const row = client.models.get(model) ?? {
                model,
                requests: 0,
                inputTokens: 0,
                outputTokens: 0,
                tokensUsed: 0,
                estimatedCost: 0,
                lastUsedAt: null,
              };
              row.requests += 1;
              row.inputTokens += snapshot.inputTokens ?? 0;
              row.outputTokens += snapshot.outputTokens ?? 0;
              row.tokensUsed += snapshot.tokensUsed ?? 0;
              row.estimatedCost += snapshot.cost ?? 0;
              if (!row.lastUsedAt || snapshot.timestamp > row.lastUsedAt) row.lastUsedAt = snapshot.timestamp;
              client.models.set(model, row);
              clientKeys.set(marker[1], client);
            }
          }

          const apiKeyRecords = await listGatewayApiKeys();
          const apiKeys = apiKeyRecords.map((record) => {
            const client = clientKeys.get(record.id) ?? {
              id: record.id,
              name: record.name,
              models: new Map<string, ClientModelUsage>(),
            };
            const models = [...client.models.values()].sort((a, b) => b.requests - a.requests);
            const totals = models.reduce(
              (sum, model) => ({
                requests: sum.requests + model.requests,
                inputTokens: sum.inputTokens + model.inputTokens,
                outputTokens: sum.outputTokens + model.outputTokens,
                tokensUsed: sum.tokensUsed + model.tokensUsed,
                estimatedCost: sum.estimatedCost + model.estimatedCost,
              }),
              { requests: 0, inputTokens: 0, outputTokens: 0, tokensUsed: 0, estimatedCost: 0 }
            );
            return {
              id: client.id,
              name: client.name,
              active: record.active && !record.expired,
              expiresAt: record.expiresAt ?? null,
              models,
              totals,
            };
          }).sort((a, b) => a.name.localeCompare(b.name));

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
            { models, apiKeys, truncatedTokens, failedSnapshotReads, snapshotLimitPerToken: SNAPSHOT_LIMIT_PER_TOKEN },
            { headers: { "Cache-Control": "no-store" } }
          );
        } catch (error) {
          const requestId = globalThis.crypto.randomUUID();
          console.error("[ATH Gateway] Usage view failed", {
            requestId,
            errorName: error instanceof Error ? error.name : "UnknownError",
          });
          return Response.json(
            { error: "No se pudo cargar el uso del gateway.", request_id: requestId },
            { status: 500, headers: { "Cache-Control": "no-store" } }
          );
        }
      },
    },
  },
});
