import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import { createSessionToken, COOKIE_NAME } from "../../../lib/auth";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { password?: string };
        if (!body.password) {
          return Response.json({ error: "Password required" }, { status: 400 });
        }

        const expected = process.env.AUTH_PASSWORD;
        if (!expected || body.password !== expected) {
          return Response.json({ error: "Invalid password" }, { status: 401 });
        }

        setCookie(COOKIE_NAME, createSessionToken(), {
          httpOnly: true,
          secure: process.env.VERCEL === "1",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });
        return Response.json({ ok: true });
      },
    },
  },
});