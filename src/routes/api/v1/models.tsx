import { createFileRoute } from "@tanstack/react-router";
import { loadAdapter } from "../../../lib/storage-adapter";

export const Route = createFileRoute("/api/v1/models")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const adapter = await loadAdapter();
          const tokens = await adapter.getTokens();

          const modelsList: Array<{ id: string; object: string; created: number; owned_by: string }> = [];
          const now = Math.floor(Date.now() / 1000);

          for (const t of tokens) {
            if (!t.active) continue;
            // Add provider namespace model
            modelsList.push({
              id: `${t.provider}/${t.slug}`,
              object: "model",
              created: now,
              owned_by: t.provider,
            });
            modelsList.push({
              id: `${t.provider}/default`,
              object: "model",
              created: now,
              owned_by: t.provider,
            });
          }

          // Common aliases
          modelsList.push(
            { id: "deepseek/deepseek-chat", object: "model", created: now, owned_by: "deepseek" },
            { id: "google/gemini-2.5-flash", object: "model", created: now, owned_by: "google" },
            { id: "groq/llama-3.3-70b-versatile", object: "model", created: now, owned_by: "groq" },
            { id: "openrouter/anthropic/claude-3.5-sonnet", object: "model", created: now, owned_by: "openrouter" }
          );

          return Response.json({
            object: "list",
            data: modelsList,
          });
        } catch (err: any) {
          return Response.json(
            { error: { message: err.message || "Failed to list models" } },
            { status: 500 }
          );
        }
      },
    },
  },
});
