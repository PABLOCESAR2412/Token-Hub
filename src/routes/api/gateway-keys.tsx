import { createFileRoute } from "@tanstack/react-router";
import { isAuthorized, isRecoverySession } from "../../lib/auth";
import {
  copyGatewayApiKey,
  createGatewayApiKey,
  listGatewayApiKeys,
  rotateGatewayApiKey,
  setGatewayApiKeyActive,
  testGatewayApiKeyConnection,
} from "../../lib/gateway-keys";

function isAdminRequest(request: Request): boolean {
  return isAuthorized(request) && !isRecoverySession(request);
}

function unauthorized(): Response {
  return Response.json({ error: "Debes iniciar sesión para administrar las keys del gateway." }, { status: 401 });
}

function unavailable(error: unknown): Response {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("ENCRYPTION_KEY")) {
    return Response.json({ error: "Configura ENCRYPTION_KEY en Vercel para guardar y copiar API keys de forma cifrada." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (message.includes("requiere APP_STORAGE")) {
    return Response.json({ error: "Configura el almacenamiento Convex en Vercel para administrar las keys." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ error: "No se pudo completar la operación de API keys." }, { status: 500, headers: { "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/gateway-keys")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAdminRequest(request)) return unauthorized();

        try {
          return Response.json({ keys: await listGatewayApiKeys() }, { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          return unavailable(error);
        }
      },
      POST: async ({ request }) => {
        if (!isAdminRequest(request)) return unauthorized();

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "El cuerpo debe ser JSON válido." }, { status: 400 });
        }

        const fields = body && typeof body === "object" ? (body as { name?: unknown; expiresAt?: unknown }) : {};
        if (typeof fields.name !== "string") {
          return Response.json({ error: "Indica un nombre para la API key." }, { status: 400 });
        }
        if (fields.expiresAt !== undefined && fields.expiresAt !== null && typeof fields.expiresAt !== "string") {
          return Response.json({ error: "La fecha de caducidad no es válida." }, { status: 400 });
        }

        try {
          const created = await createGatewayApiKey(fields.name, fields.expiresAt as string | null | undefined);
          return Response.json(created, { status: 201, headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (message.includes("nombre") || message.includes("expiración")) {
            return Response.json({ error: message }, { status: 400, headers: { "Cache-Control": "no-store" } });
          }
          return unavailable(error);
        }
      },
      PATCH: async ({ request }) => {
        if (!isAdminRequest(request)) return unauthorized();

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "El cuerpo debe ser JSON válido." }, { status: 400 });
        }

        const fields = body && typeof body === "object"
          ? (body as { id?: unknown; active?: unknown; action?: unknown; expiresAt?: unknown })
          : {};
        if (typeof fields.id !== "string") {
          return Response.json({ error: "Indica el id de la API key." }, { status: 400 });
        }

        try {
          if (fields.action === "copy") {
            const key = await copyGatewayApiKey(fields.id);
            if (!key) return Response.json({ error: "Esta key no se puede copiar. Rótala para generar una nueva." }, { status: 409, headers: { "Cache-Control": "no-store" } });
            return Response.json({ key }, { headers: { "Cache-Control": "no-store" } });
          }

          if (fields.action === "test") {
            const result = await testGatewayApiKeyConnection(fields.id);
            if (!result) return Response.json({ error: "API key no encontrada." }, { status: 404, headers: { "Cache-Control": "no-store" } });
            if (!result.valid) return Response.json({ error: "La API key está inactiva, caducada o debe renovarse." }, { status: 409, headers: { "Cache-Control": "no-store" } });
            return Response.json(result, { headers: { "Cache-Control": "no-store" } });
          }

          if (fields.action === "rotate") {
            if (fields.expiresAt !== undefined && fields.expiresAt !== null && typeof fields.expiresAt !== "string") {
              return Response.json({ error: "La fecha de caducidad no es válida." }, { status: 400 });
            }
            const rotated = await rotateGatewayApiKey(fields.id, fields.expiresAt as string | null | undefined);
            if (!rotated) return Response.json({ error: "API key no encontrada." }, { status: 404 });
            return Response.json(rotated, { headers: { "Cache-Control": "no-store" } });
          }

          if (typeof fields.active !== "boolean") {
            return Response.json({ error: "Indica el estado activo de la key." }, { status: 400 });
          }
          const key = await setGatewayApiKeyActive(fields.id, fields.active);
          if (!key) return Response.json({ error: "API key no encontrada." }, { status: 404 });
          return Response.json({ key }, { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (message.includes("expiración")) {
            return Response.json({ error: message }, { status: 400, headers: { "Cache-Control": "no-store" } });
          }
          return unavailable(error);
        }
      },
    },
  },
});
