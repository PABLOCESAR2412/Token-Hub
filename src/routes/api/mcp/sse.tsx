import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mcp/sse")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const sessionId = crypto.randomUUID();
        const messageEndpoint = `${url.origin}/api/mcp/message?sessionId=${sessionId}`;

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            // Emit the standard MCP SSE endpoint event
            controller.enqueue(encoder.encode(`event: endpoint\ndata: ${messageEndpoint}\n\n`));

            // Keepalive ping every 15 seconds
            const interval = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(`: keepalive\n\n`));
              } catch {
                clearInterval(interval);
              }
            }, 15000);

            request.signal.addEventListener("abort", () => {
              clearInterval(interval);
              try {
                controller.close();
              } catch {}
            });
          },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
