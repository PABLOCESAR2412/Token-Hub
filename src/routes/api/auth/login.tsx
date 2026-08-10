import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import { createSessionToken, COOKIE_NAME } from "../../../lib/auth";
import { DEFAULT_PASSWORD } from "../../../lib/credentials";
import { verifyOwnerPassword, getAuthState } from "../../../lib/credentials";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { password?: string };
        if (!body.password) {
          return Response.json({ error: "Password required" }, { status: 400 });
        }

        const ok = await verifyOwnerPassword(body.password);
        if (!ok) {
          return Response.json({ error: "Invalid password" }, { status: 401 });
        }

        const { mustChangePassword } = await getAuthState();

        setCookie(COOKIE_NAME, createSessionToken(), {
          httpOnly: true,
          secure: process.env.VERCEL === "1",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });

        return Response.json({
          ok: true,
          mustChangePassword,
          expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
          hint: mustChangePassword ? `Usa la contraseña por defecto: ${DEFAULT_PASSWORD}` : undefined,
        });
      },
    },
  },
});