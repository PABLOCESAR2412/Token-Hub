import { createFileRoute } from "@tanstack/react-router";
import { loadAdapter } from "../../../lib/storage-adapter";
import { getUnifiedModelGroups } from "../../../lib/proxy/model-groups";
import { isValidGatewayApiKey } from "../../../lib/gateway-keys";

export const Route = createFileRoute("/api/v1/models")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization");
          const cookieHeader = request.headers.get("cookie");
          const adapter = await loadAdapter();
          const tokens = await adapter.getTokens();

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
              tokens.some(
                (t) =>
                  t.slug === rawKey ||
                  t.id === rawKey ||
                  t.name.toLowerCase() === rawKey.toLowerCase() ||
                  t.provider.toLowerCase() === rawKey.toLowerCase()
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
              { status: 401 }
            );
          }

          const modelsList: Array<{ id: string; object: string; created: number; owned_by: string }> = [];
          const now = Math.floor(Date.now() / 1000);

          for (const t of tokens) {
            if (!t.active) continue;
            // Add provider namespace model
            modelsList.push({
              id: `${t.provider}/${t.slug}`,
              object: "model",
              created: now,
              owned_by: t.provider,
            });
            for (const model of t.selectedModels ?? []) {
              modelsList.push({
                id: `${t.provider}/${model}`,
                object: "model",
                created: now,
                owned_by: t.provider,
              });
            }
            modelsList.push({
              id: `${t.provider}/default`,
              object: "model",
              created: now,
              owned_by: t.provider,
            });
          }

          // Publish aliases that have configured routes across multiple providers.
          for (const group of getUnifiedModelGroups(tokens)) {
            modelsList.push({
              id: group.id,
              object: "model",
              created: now,
              owned_by: "agent-token-hub",
            });
          }

          // Common aliases
          modelsList.push(
            { id: "typesafe/jev-latest", object: "model", created: now, owned_by: "jev" },
            { id: "typesafe/jev-1.14", object: "model", created: now, owned_by: "jev" },
            { id: "typesafe/jev-router", object: "model", created: now, owned_by: "jev" },
            { id: "google/gemini-4-argon", object: "model", created: now, owned_by: "google" },
            { id: "deepseek/deepseek-chat", object: "model", created: now, owned_by: "deepseek" },
            { id: "google/gemini-2.5-flash", object: "model", created: now, owned_by: "google" },
            { id: "groq/llama-3.3-70b-versatile", object: "model", created: now, owned_by: "groq" },
            { id: "openrouter/anthropic/claude-3.5-sonnet", object: "model", created: now, owned_by: "openrouter" }
          );

          const uniqueModelsList = [...new Map(modelsList.map((model) => [model.id, model])).values()];

          return Response.json({
            object: "list",
            data: uniqueModelsList,
          });
        } catch (err: any) {
          return Response.json(
            { error: { message: err.message || "Failed to list models" } },
            { status: 500 }
          );
        }
      },
    },
  },
});
