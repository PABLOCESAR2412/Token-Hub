import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import { createSessionToken, COOKIE_NAME, isSecureContext } from "../../../lib/auth";
import { verifyOwnerTotp, getTotpEnabled } from "../../../lib/credentials";
import { checkRateLimit, resetRateLimit, getClientIp } from "../../../lib/rate-limiter";

// Recovery flow: the owner authenticates with either their 2FA code or the
// server-configured AUTH_PASSWORD master secret.
export const Route = createFileRoute("/api/auth/forgot-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const clientIp = getClientIp(request);
          const rateLimit = checkRateLimit(`recovery:${clientIp}`, {
            maxAttempts: 5,
            windowMs: 5 * 60 * 1000,
          });

          if (!rateLimit.allowed) {
            return Response.json(
              {
                error: `// Demasiados intentos de recuperación. Bloqueado temporalmente. Reintenta en ${rateLimit.retryAfterSeconds} segundos.`,
              },
              {
                status: 429,
                headers: {
                  "Retry-After": String(rateLimit.retryAfterSeconds),
                },
              }
            );
          }

          const body = (await request.json().catch(() => ({}))) as { code?: string };
          const input = (body.code || "").trim();
          if (!input) {
            return Response.json({ error: "// Ingresa tu código 2FA o clave maestra" }, { status: 400 });
          }

          const hasTotp = await getTotpEnabled();
          const masterSecret = process.env.AUTH_PASSWORD;
          let ok = false;

          // 1. Verify against master AUTH_PASSWORD configured in environment
          if (masterSecret && input === masterSecret) {
            ok = true;
          }

          // 2. Verify against 2FA TOTP code if enabled
          if (!ok && hasTotp && /^\d{6}$/.test(input)) {
            ok = await verifyOwnerTotp(input);
          }

          // 3. Handle when 2FA is not enabled
          if (!ok && !hasTotp) {
            return Response.json(
              {
                error: "// 2FA no configurado. Ingresa la clave maestra AUTH_PASSWORD configurada en tu servidor.",
              },
              { status: 400 }
            );
          }

          if (!ok) {
            return Response.json({ error: "// Código 2FA o clave maestra incorrecta" }, { status: 401 });
          }

          resetRateLimit(`recovery:${clientIp}`);

          setCookie(COOKIE_NAME, createSessionToken("recovery"), {
            httpOnly: true,
            secure: isSecureContext(request),
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          });

          return Response.json({ ok: true, recovery: true });
        } catch (err: any) {
          console.error("Error en /api/auth/forgot-password:", err);
          return Response.json({ error: err?.message || "// Error al procesar recuperación" }, { status: 500 });
        }
      },
    },
  },
});
