import { createFileRoute } from "@tanstack/react-router";
import { loadAdapter } from "../../../lib/storage-adapter";
import {
  getProviderModelId,
  getTokensWithDiscoveredModels,
  getUnifiedModelGroups,
  isRoutableModel,
} from "../../../lib/proxy/model-groups";
import { isValidGatewayApiKey } from "../../../lib/gateway-keys";

export const Route = createFileRoute("/api/v1/models")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization");
          const cookieHeader = request.headers.get("cookie");
          const adapter = await loadAdapter();
          const storedTokens = await adapter.getTokens();

          const rawKey = authHeader?.replace(/^Bearer\s+/i, "").trim() || "";
          const masterPassword = process.env.AUTH_PASSWORD?.trim();
          const gatewayKey = process.env.GATEWAY_KEY?.trim() || process.env.GATEWAY_SECRET?.trim();
          const isManagedGatewayKey = await isValidGatewayApiKey(rawKey);
          const isMasterKey =
            Boolean(rawKey) &&
            ((Boolean(masterPassword) && rawKey === masterPassword) ||
              (Boolean(gatewayKey) && rawKey === gatewayKey) ||
              isManagedGatewayKey);

          let hasSession = false;
          if (cookieHeader) {
            const match = cookieHeader.match(/ath_session=([^;]+)/);
            if (match && match[1]) {
              try {
                const { verifySessionToken } = await import("../../../lib/auth");
                hasSession = verifySessionToken(decodeURIComponent(match[1].trim()));
              } catch {}
            }
          }

          const hasValidTokenKey = Boolean(
            rawKey &&
              storedTokens.some(
                (token) =>
                  token.slug === rawKey ||
                  token.id === rawKey ||
                  token.name.toLowerCase() === rawKey.toLowerCase() ||
                  token.provider.toLowerCase() === rawKey.toLowerCase()
              )
          );

          const isDemo = process.env.APP_MODE === "demo" && !masterPassword && !gatewayKey;
          if (!isMasterKey && !hasSession && !hasValidTokenKey && !isDemo) {
            return Response.json(
              {
                error: {
                  message: "Unauthorized: Invalid or missing API key.",
                  type: "invalid_request_error",
                  code: "unauthorized",
                },
              },
              { status: 401, headers: { "Cache-Control": "no-store" } }
            );
          }

          const tokens = await getTokensWithDiscoveredModels(storedTokens);
          const availableTokens = tokens.filter(
            (token) =>
              token.active &&
              !(typeof token.maxUsd === "number" && token.maxUsd > 0 && token.totalCost >= token.maxUsd)
          );
          const now = Math.floor(Date.now() / 1000);
          const catalog = new Map<string, {
            id: string;
            object: string;
            created: number;
            owned_by: string;
            providers: string[];
            unified: boolean;
          }>();

          const addModel = (model: {
            id: string;
            provider: string;
            providers?: string[];
            unified?: boolean;
          }) => {
            const previous = catalog.get(model.id);
            const providers = [...new Set([...(previous?.providers ?? []), ...(model.providers ?? [model.provider])])].sort();
            catalog.set(model.id, {
              id: model.id,
              object: "model",
              created: now,
              owned_by: model.unified ? "agent-token-hub" : model.provider,
              providers,
              unified: Boolean(previous?.unified || model.unified),
            });
          };

          const groups = getUnifiedModelGroups(availableTokens);
          const groupedRoutes = new Set<string>();
          for (const group of groups) {
            addModel({
              id: group.id,
              provider: "agent-token-hub",
              providers: [...new Set(group.routes.map((route) => route.token.provider))],
              unified: true,
            });
            for (const route of group.routes) {
              groupedRoutes.add(`${route.token.id}\u0000${route.upstreamModel.toLowerCase()}`);
            }
          }

          for (const token of availableTokens) {
            for (const model of new Set(token.selectedModels ?? [])) {
              if (!isRoutableModel(model, token.provider)) continue;
              if (groupedRoutes.has(`${token.id}\u0000${model.trim().toLowerCase()}`)) continue;
              addModel({
                id: getProviderModelId(token.provider, model),
                provider: token.provider,
              });
            }
          }

          return Response.json(
            { object: "list", data: [...catalog.values()] },
            { headers: { "Cache-Control": "no-store" } }
          );
        } catch {
          return Response.json(
            { error: { message: "Internal error while listing models" } },
            { status: 500, headers: { "Cache-Control": "no-store" } }
          );
        }
      },
    },
  },
});
