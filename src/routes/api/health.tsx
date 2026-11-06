import { createFileRoute } from "@tanstack/react-router";
import { loadAdapter } from "../../lib/storage-adapter";
import { isEncryptionKeyConfigured } from "../../lib/crypto";
import { getCurrentVersion } from "../../lib/version";
import { getCacheStats } from "../../lib/proxy/cache";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const startTime = Date.now();
        let storageStatus: "connected" | "error" = "connected";
        let storageLatencyMs = 0;
        let tokenCount = 0;
        let storageError: string | null = null;

        const storageType = process.env.APP_STORAGE || "convex";

        try {
          const t0 = Date.now();
          const adapter = await loadAdapter();
          const tokens = await adapter.getTokens();
          storageLatencyMs = Date.now() - t0;
          tokenCount = Array.isArray(tokens) ? tokens.length : 0;
        } catch (err: any) {
          storageStatus = "error";
          storageError = err?.message || "Error al conectar con el backend de almacenamiento";
        }

        const isHealthy = storageStatus === "connected";
        const authPasswordConfigured = Boolean(
          process.env.AUTH_PASSWORD && process.env.AUTH_PASSWORD.length >= 8
        );
        const telegramConfigured = Boolean(
          process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
        );
        const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());

        const responsePayload = {
          status: isHealthy ? "healthy" : "unhealthy",
          version: getCurrentVersion(),
          timestamp: new Date().toISOString(),
          uptimeSeconds: Math.floor(process.uptime()),
          memoryMb: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
          cache: getCacheStats(),
          storage: {
            type: storageType,
            status: storageStatus,
            latencyMs: storageLatencyMs,
            tokenCount,
            error: storageError,
          },
          configuration: {
            encryptionKey: isEncryptionKeyConfigured(),
            authPassword: authPasswordConfigured,
            telegramAlerts: telegramConfigured,
            cronSecret: cronSecretConfigured,
          },
          totalLatencyMs: Date.now() - startTime,
        };

        return Response.json(responsePayload, {
          status: isHealthy ? 200 : 503,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        });
      },
    },
  },
});
