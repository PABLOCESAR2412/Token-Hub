import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import { createSessionToken, COOKIE_NAME, isSecureContext } from "../../../lib/auth";
import { verifyOwnerPassword, getAuthState } from "../../../lib/credentials";
import { checkRateLimit, resetRateLimit, getClientIp } from "../../../lib/rate-limiter";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const clientIp = getClientIp(request);
          const rateLimit = checkRateLimit(`login:${clientIp}`, {
            maxAttempts: 5,
            windowMs: 5 * 60 * 1000,
          });

          if (!rateLimit.allowed) {
            return Response.json(
              {
                error: `// Demasiados intentos fallidos. Bloqueado temporalmente por seguridad. Reintenta en ${rateLimit.retryAfterSeconds} segundos.`,
              },
              {
                status: 429,
                headers: {
                  "Retry-After": String(rateLimit.retryAfterSeconds),
                },
              }
            );
          }

          const body = (await request.json().catch(() => ({}))) as { password?: string };
          if (!body.password) {
            return Response.json({ error: "Password required" }, { status: 400 });
          }

          const ok = await verifyOwnerPassword(body.password);
          if (!ok) {
            return Response.json(
              {
                error: "// Contraseña incorrecta",
              },
              { status: 401 }
            );
          }

          // Reset failed attempts on successful authentication
          resetRateLimit(`login:${clientIp}`);

          const { mustChangePassword } = await getAuthState();

          setCookie(COOKIE_NAME, createSessionToken(), {
            httpOnly: true,
            secure: isSecureContext(request),
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          });

          return Response.json({
            ok: true,
            mustChangePassword,
            expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
            hint: mustChangePassword ? "Debes cambiar tu contraseña antes de continuar." : undefined,
          });
        } catch (err: any) {
          console.error("Error en /api/auth/login:", err);
          const msg = err?.message || "";
          if (msg.includes("Can't reach database") || msg.includes("PrismaClient") || msg.includes("database server")) {
            return Response.json(
              { error: "// Error: No se puede conectar a la base de datos (Supabase está pausada o inaccesible)" },
              { status: 503 }
            );
          }
          if (msg.includes("AUTH_PASSWORD")) {
            return Response.json(
              { error: "// Error de configuración: falta variable AUTH_PASSWORD en el servidor" },
              { status: 500 }
            );
          }
          return Response.json(
            { error: msg || "// Error interno al procesar el login" },
            { status: 500 }
          );
        }
      },
    },
  },
});
