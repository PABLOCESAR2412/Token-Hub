import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { verifySessionToken, sessionKind, COOKIE_NAME } from "../../../lib/auth";
import { getAuthState } from "../../../lib/credentials";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async () => {
        const token = getCookie(COOKIE_NAME);
        const authed = verifySessionToken(token);
        if (!authed) return Response.json({ authed: false });

        const { mustChangePassword } = await getAuthState();
        const recovery = sessionKind(token) === "recovery";
        // After a successful recovery the owner MUST set a new password.
        const needsChange = mustChangePassword || recovery;
        return Response.json({ authed: true, mustChangePassword: needsChange, recovery });
      },
    },
  },
});