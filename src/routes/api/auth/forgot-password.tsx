import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import { createSessionToken, COOKIE_NAME } from "../../../lib/auth";
import { verifyOwnerTotp, getTotpEnabled, getAuthState, DEFAULT_PASSWORD } from "../../../lib/credentials";

// Recovery flow: the owner forgot the password, so they authenticate with
// either their 2FA code or their environment AUTH_PASSWORD, or if 2FA is not
// configured, they are guided to use the initial password or master key.
export const Route = createFileRoute("/api/auth/forgot-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
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
            const { mustChangePassword } = await getAuthState();
            if (input === DEFAULT_PASSWORD) {
              ok = true;
            } else {
              return Response.json(
                {
                  error: mustChangePassword
                    ? `// 2FA no configurado aún. La contraseña actual es la inicial: ${DEFAULT_PASSWORD}`
                    : "// 2FA no configurado. Ingresa el AUTH_PASSWORD maestro configurado en tus variables de entorno.",
                },
                { status: 400 }
              );
            }
          }

          if (!ok) {
            return Response.json({ error: "// Código 2FA o clave maestra incorrecta" }, { status: 401 });
          }

          setCookie(COOKIE_NAME, createSessionToken("recovery"), {
            httpOnly: true,
            secure: process.env.VERCEL === "1",
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