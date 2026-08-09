import { createFileRoute } from "@tanstack/react-router";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { verifySessionToken, sessionKind, createSessionToken, COOKIE_NAME } from "../../../lib/auth";
import { changeOwnerPassword, setOwnerPassword } from "../../../lib/credentials";

export const Route = createFileRoute("/api/auth/change-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = getCookie(COOKIE_NAME);
        const authed = verifySessionToken(token);
        if (!authed) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json().catch(() => ({}))) as {
          currentPassword?: string;
          newPassword?: string;
        };

        const recovery = sessionKind(token) === "recovery";

        const result = recovery
          ? await setOwnerPassword(body.newPassword || "")
          : await changeOwnerPassword(body.currentPassword || "", body.newPassword || "");

        if (!result.ok) {
          return Response.json({ error: result.error }, { status: 400 });
        }

        // A successful change promotes a recovery session to a normal one so
        // the owner is not stuck on the change-password screen.
        if (recovery) {
          setCookie(COOKIE_NAME, createSessionToken("session"), {
            httpOnly: true,
            secure: process.env.VERCEL === "1",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          });
        }

        return Response.json({ ok: true });
      },
    },
  },
});