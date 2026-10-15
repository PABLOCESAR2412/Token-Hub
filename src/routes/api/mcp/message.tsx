import { createFileRoute } from "@tanstack/react-router";
import { handleMcpJsonRpc } from "../../../lib/mcp";

export const Route = createFileRoute("/api/mcp/message")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") || request.headers.get("x-ath-key");
          const body = await request.json().catch(() => null);

          if (!body) {
            return Response.json(
              {
                jsonrpc: "2.0",
                id: null,
                error: { code: -32700, message: "Parse error" },
              },
              { status: 400 }
            );
          }

          if (Array.isArray(body)) {
            const results = await Promise.all(
              body.map((single) => handleMcpJsonRpc(single, authHeader))
            );
            return Response.json(results);
          }

          const response = await handleMcpJsonRpc(body, authHeader);
          return Response.json(response);
        } catch (err: any) {
          return Response.json(
            {
              jsonrpc: "2.0",
              id: null,
              error: { code: -32603, message: err.message },
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
