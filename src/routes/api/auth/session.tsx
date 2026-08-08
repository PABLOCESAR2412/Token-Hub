import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { verifySessionToken, COOKIE_NAME } from "../../../lib/auth";
import { getAuthState } from "../../../lib/credentials";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async () => {
        const token = getCookie(COOKIE_NAME);
        const authed = verifySessionToken(token);
        if (!authed) return Response.json({ authed: false });

        const { mustChangePassword } = await getAuthState();
        return Response.json({ authed: true, mustChangePassword });
      },
    },
  },
});