import { createFileRoute } from "@tanstack/react-router";
import { resolveUpstreamTarget, forwardChatRequest, extractCallerInfo } from "../../../../lib/proxy/engine";

export const Route = createFileRoute("/api/v1/chat/completions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization");
          const cookieHeader = request.headers.get("cookie");
          const body = (await request.json().catch(() => null)) as any;

          if (!body || !body.messages || !Array.isArray(body.messages)) {
            return Response.json(
              {
                error: {
                  message: "Invalid request payload. 'messages' array is required.",
                  type: "invalid_request_error",
                },
              },
              { status: 400 }
            );
          }

          const modelRequested = body.model || "default";
          const target = await resolveUpstreamTarget(authHeader, modelRequested, cookieHeader, body.messages);
          const callerInfo = {
            ...extractCallerInfo(request),
            agent: request.headers.get("x-ath-agent") || request.headers.get("x-agent-id") || undefined,
          };

          return await forwardChatRequest(target, body, callerInfo);
        } catch (err: any) {
          const isUnauthorized =
            typeof err.message === "string" && err.message.toLowerCase().includes("unauthorized");

          return Response.json(
            {
              error: {
                message: err.message || "Internal gateway proxy error",
                type: isUnauthorized ? "invalid_request_error" : "gateway_error",
                code: isUnauthorized ? "unauthorized" : undefined,
              },
            },
            { status: isUnauthorized ? 401 : 400 }
          );
        }
      },
    },
  },
});
