import { createFileRoute } from "@tanstack/react-router";
import { resolveUpstreamTarget, forwardChatRequest, extractCallerInfo } from "../../../../lib/proxy/engine";

function safeGatewayFailure(error: unknown): { status: number; message: string; type: string; code: string } {
  const detail = error instanceof Error ? error.message.toLowerCase() : "";
  if (detail.includes("unauthorized")) {
    return { status: 401, message: "Unauthorized", type: "invalid_request_error", code: "unauthorized" };
  }
  if (detail.includes("no tokens registered") || detail.includes("no matching token")) {
    return { status: 409, message: "No hay proveedores activos disponibles para esta solicitud.", type: "gateway_error", code: "no_provider_available" };
  }
  if (detail.includes("unified model") && (detail.includes("unavailable") || detail.includes("no eligible"))) {
    return { status: 404, message: "El modelo solicitado no tiene una ruta disponible.", type: "invalid_request_error", code: "model_unavailable" };
  }
  if (detail.includes("paused by gatekeeper") || detail.includes("spend cap")) {
    return { status: 429, message: "El proveedor seleccionado alcanzó su límite y no hay una ruta de respaldo disponible.", type: "gateway_error", code: "provider_limit" };
  }
  if (detail.includes("servicesecret") || detail.includes("not in the validator") || detail.includes("argumentvalidationerror")) {
    return { status: 503, message: "La versión de Convex vinculada al gateway no está actualizada. Revisa el despliegue del backend Convex.", type: "gateway_error", code: "convex_deployment_mismatch" };
  }
  if (detail.includes("encryption_key")) {
    return { status: 503, message: "Falta configurar ENCRYPTION_KEY en las variables de entorno de Vercel.", type: "gateway_error", code: "encryption_configuration" };
  }
  return { status: 500, message: "Error interno del gateway. Revisa los registros de Vercel con el identificador de solicitud.", type: "gateway_error", code: "internal_error" };
}

export const Route = createFileRoute("/api/v1/chat/completions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization");
          const cookieHeader = request.headers.get("cookie");
          const body = (await request.json().catch(() => null)) as any;

          if (!body || !body.messages || !Array.isArray(body.messages)) {
            return Response.json(
              {
                error: {
                  message: "Invalid request payload. 'messages' array is required.",
                  type: "invalid_request_error",
                },
              },
              { status: 400 }
            );
          }

          const modelRequested = body.model || "default";
          const target = await resolveUpstreamTarget(authHeader, modelRequested, cookieHeader, body.messages);
          const callerInfo = {
            ...extractCallerInfo(request),
            agent: request.headers.get("x-ath-agent") || request.headers.get("x-agent-id") || undefined,
            gatewayApiKey: target.gatewayApiKey,
          };

          return await forwardChatRequest(target, body, callerInfo);
        } catch (err: unknown) {
          const failure = safeGatewayFailure(err);
          const requestId = globalThis.crypto.randomUUID();
          console.error("[ATH Gateway] Request failed", {
            requestId,
            code: failure.code,
            errorName: err instanceof Error ? err.name : "UnknownError",
          });
          return Response.json(
            {
              error: {
                message: failure.message,
                type: failure.type,
                code: failure.code,
                request_id: requestId,
              },
            },
            { status: failure.status, headers: { "Cache-Control": "no-store" } }
          );
        }
      },
    },
  },
});
