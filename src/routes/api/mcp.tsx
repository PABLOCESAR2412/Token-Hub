import { createFileRoute } from "@tanstack/react-router";
import { handleMcpJsonRpc, MCP_SERVER_INFO, MCP_TOOLS, MCP_RESOURCES, MCP_PROMPTS } from "../../lib/mcp";

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        return Response.json({
          status: "ONLINE",
          name: MCP_SERVER_INFO.name,
          version: MCP_SERVER_INFO.version,
          protocol: MCP_SERVER_INFO.protocolVersion,
          description: MCP_SERVER_INFO.description,
          endpoints: {
            http: `${url.origin}/api/mcp`,
            sse: `${url.origin}/api/mcp/sse`,
          },
          capabilities: {
            tools: MCP_TOOLS.map((t) => t.name),
            resources: MCP_RESOURCES.map((r) => r.uri),
            prompts: MCP_PROMPTS.map((p) => p.name),
          },
          authentication: {
            type: "Bearer token in Authorization header",
            passwordEnv: "AUTH_PASSWORD",
          },
          instructions:
            "Para conectar este baúl como conector MCP a Cursor, Windsurf, Claude Desktop o tu agente, apunta a este endpoint mediante transporte HTTP o SSE.",
        });
      },

      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") || request.headers.get("x-ath-key");
          const body = await request.json().catch(() => null);

          if (!body) {
            return Response.json(
              {
                jsonrpc: "2.0",
                id: null,
                error: { code: -32700, message: "Parse error: cuerpo JSON inválido" },
              },
              { status: 400 }
            );
          }

          // Handle batch JSON-RPC or single JSON-RPC
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
              error: { code: -32603, message: `Error interno de servidor MCP: ${err.message}` },
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
