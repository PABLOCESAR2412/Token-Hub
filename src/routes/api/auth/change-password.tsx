import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { verifySessionToken, COOKIE_NAME } from "../../../lib/auth";
import { changeOwnerPassword } from "../../../lib/credentials";

export const Route = createFileRoute("/api/auth/change-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = verifySessionToken(getCookie(COOKIE_NAME));
        if (!authed) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json().catch(() => ({}))) as {
          currentPassword?: string;
          newPassword?: string;
        };

        const result = await changeOwnerPassword(
          body.currentPassword || "",
          body.newPassword || ""
        );

        if (!result.ok) {
          return Response.json({ error: result.error }, { status: 400 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});