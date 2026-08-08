import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { verifySessionToken, COOKIE_NAME } from "../../../lib/auth";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: () => {
        const token = getCookie(COOKIE_NAME);
        const authed = verifySessionToken(token);
        return Response.json({ authed });
      },
    },
  },
});