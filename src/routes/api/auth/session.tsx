import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { verifySessionToken, sessionKind, sessionExpiry, COOKIE_NAME } from "../../../lib/auth";
import { getAuthState } from "../../../lib/credentials";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const token = getCookie(COOKIE_NAME);
          const authed = verifySessionToken(token);
          if (!authed) return Response.json({ authed: false });

          const { mustChangePassword } = await getAuthState();
          const recovery = sessionKind(token) === "recovery";
          // After a successful recovery the owner MUST set a new password.
          const needsChange = mustChangePassword || recovery;
          return Response.json({
            authed: true,
            mustChangePassword: needsChange,
            recovery,
            expiresAt: sessionExpiry(token),
          });
        } catch (err: any) {
          console.error("Error en /api/auth/session:", err);
          return Response.json({ authed: false, error: err?.message || "Error al verificar sesión" });
        }
      },
    },
  },
});