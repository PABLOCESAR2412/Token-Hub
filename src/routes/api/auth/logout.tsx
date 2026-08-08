import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import { COOKIE_NAME } from "../../../lib/auth";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async () => {
        setCookie(COOKIE_NAME, "", {
          httpOnly: true,
          secure: process.env.VERCEL === "1",
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        });
        return Response.json({ ok: true });
      },
    },
  },
});