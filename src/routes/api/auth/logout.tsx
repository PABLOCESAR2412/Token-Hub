import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import { COOKIE_NAME, isSecureContext } from "../../../lib/auth";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        setCookie(COOKIE_NAME, "", {
          httpOnly: true,
          secure: isSecureContext(request),
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        });
        return Response.json({ ok: true });
      },
    },
  },
});