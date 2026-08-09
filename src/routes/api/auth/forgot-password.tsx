import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import { createSessionToken, COOKIE_NAME } from "../../../lib/auth";
import { verifyOwnerTotp, getTotpEnabled } from "../../../lib/credentials";

// Recovery flow: the owner forgot the password, so they authenticate with the
// 2FA code first, then are taken to the change-password screen (recovery session).
export const Route = createFileRoute("/api/auth/forgot-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { code?: string };
        if (!body.code || !/^\d{6}$/.test(body.code)) {
          return Response.json({ error: "// Ingresa tu codigo 2FA de 6 digitos" }, { status: 400 });
        }

        if (!(await getTotpEnabled())) {
          return Response.json({ error: "// 2FA no configurado: no hay forma de recuperar la contraseña" }, { status: 400 });
        }

        const ok = await verifyOwnerTotp(body.code);
        if (!ok) {
          return Response.json({ error: "// Codigo 2FA incorrecto" }, { status: 401 });
        }

        setCookie(COOKIE_NAME, createSessionToken("recovery"), {
          httpOnly: true,
          secure: process.env.VERCEL === "1",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });

        return Response.json({ ok: true, recovery: true });
      },
    },
  },
});