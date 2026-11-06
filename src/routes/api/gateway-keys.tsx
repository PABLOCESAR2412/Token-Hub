import { createFileRoute } from "@tanstack/react-router";
import { isAuthorized, isRecoverySession } from "../../lib/auth";
import {
  createGatewayApiKey,
  listGatewayApiKeys,
  setGatewayApiKeyActive,
} from "../../lib/gateway-keys";

function isAdminRequest(request: Request): boolean {
  return isAuthorized(request) && !isRecoverySession(request);
}

function unauthorized(): Response {
  return Response.json({ error: "Debes iniciar sesión para administrar las keys del gateway." }, { status: 401 });
}

function unavailable(error: unknown): Response {
  const message = error instanceof Error ? error.message : "No se pudo acceder al almacenamiento de API keys.";
  const status = message.includes("requiere APP_STORAGE") ? 503 : 500;
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
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

        const name = body && typeof body === "object" ? (body as { name?: unknown }).name : undefined;
        if (typeof name !== "string") {
          return Response.json({ error: "Indica un nombre para la API key." }, { status: 400 });
        }

        try {
          const created = await createGatewayApiKey(name);
          return Response.json(created, { status: 201, headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          const message = error instanceof Error ? error.message : "No se pudo crear la API key.";
          return Response.json({ error: message }, { status: message.includes("nombre") ? 400 : 500 });
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

        const fields = body && typeof body === "object" ? (body as { id?: unknown; active?: unknown }) : {};
        if (typeof fields.id !== "string" || typeof fields.active !== "boolean") {
          return Response.json({ error: "Indica el id y el estado activo de la key." }, { status: 400 });
        }

        try {
          const key = await setGatewayApiKeyActive(fields.id, fields.active);
          if (!key) return Response.json({ error: "API key no encontrada." }, { status: 404 });
          return Response.json({ key }, { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          return unavailable(error);
        }
      },
    },
  },
});
