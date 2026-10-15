import { createFileRoute } from "@tanstack/react-router";
import { resolveUpstreamTarget, forwardChatRequest, extractCallerInfo } from "../../../../lib/proxy/engine";

export const Route = createFileRoute("/api/v1/chat/completions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization");
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
          const target = await resolveUpstreamTarget(authHeader, modelRequested);
          const callerInfo = extractCallerInfo(request);

          return await forwardChatRequest(target, body, callerInfo);
        } catch (err: any) {
          return Response.json(
            {
              error: {
                message: err.message || "Internal gateway proxy error",
                type: "gateway_error",
              },
            },
            { status: 400 }
          );
        }
      },
    },
  },
});
