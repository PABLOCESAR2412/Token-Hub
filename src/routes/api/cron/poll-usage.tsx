import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { loadAdapter } from "../../../lib/storage-adapter";
import { getProviderBySlug } from "../../../lib/providers";
import { decrypt } from "../../../lib/crypto";
import { isAuthorized } from "../../../lib/auth";

// Verifies CRON_SECRET, master password, or active session to prevent unauthorized access
export const Route = createFileRoute("/api/cron/poll-usage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET?.trim();
        const masterPassword = process.env.AUTH_PASSWORD?.trim();
        const rawKey = authHeader?.replace(/^Bearer\s+/i, "").trim() || "";

        const isAuthorizedCron = Boolean(cronSecret && rawKey === cronSecret);
        const isMasterSecret = Boolean(masterPassword && rawKey === masterPassword);
        const isSessionUser = isAuthorized(request);

        if (!isAuthorizedCron && !isMasterSecret && !isSessionUser) {
          return json(
            { error: "Unauthorized: Requiere sesión de administrador o header Authorization con CRON_SECRET / clave maestra válida." },
            { status: 401 }
          );
        }

        const adapter = await loadAdapter();
        const tokens = await adapter.getTokens();

        const results: Array<{
          tokenId: string;
          provider: string;
          success: boolean;
          error?: string;
          reportedUsage?: { tokensUsed: number; cost: number; period: string; tokensApproximate: boolean };
        }> = [];

        for (const token of tokens) {
          const providerAdapter = getProviderBySlug(token.provider);
          if (!providerAdapter) {
            results.push({ tokenId: token.id, provider: token.provider, success: false, error: "Provider not supported" });
            continue;
          }

          if (!token.active) {
            results.push({ tokenId: token.id, provider: token.provider, success: false, error: "Token paused" });
            continue;
          }

          try {
            const usage = await providerAdapter.fetchUsage({
              apiKey: decrypt(token.encryptedValue),
              publicKey: token.publicKey ? decrypt(token.publicKey) : null,
              trackingKey: token.trackingKey ? decrypt(token.trackingKey) : null,
              baseUrl: token.baseUrl ?? null,
            });
            const raw = usage.raw ?? {};
            const error = typeof raw.error === "string" ? raw.error : null;
            const status = typeof raw.status === "number" ? raw.status : null;

            if (error || (status !== null && status >= 400)) {
              results.push({
                tokenId: token.id,
                provider: token.provider,
                success: false,
                error: error || `Provider returned HTTP ${status}`,
              });
              continue;
            }

            if (raw.usageSupported !== true) {
              results.push({
                tokenId: token.id,
                provider: token.provider,
                success: false,
                error: "No verified provider usage endpoint is configured",
              });
              continue;
            }

            results.push({
              tokenId: token.id,
              provider: token.provider,
              success: true,
              reportedUsage: {
                tokensUsed: Number.isFinite(usage.tokensUsed) ? usage.tokensUsed : 0,
                cost: Number.isFinite(usage.cost) ? usage.cost : 0,
                period: typeof raw.usagePeriod === "string" ? raw.usagePeriod : "provider_reported",
                tokensApproximate: raw.tokensApproximate === true,
              },
            });
          } catch (err: any) {
            results.push({ tokenId: token.id, provider: token.provider, success: false, error: err.message });
          }
        }

        // Provider totals are cumulative or windowed, so this endpoint reports them without
        // adding duplicate snapshots or changing the gateway's per-request spend total.
        return json({ timestamp: new Date().toISOString(), results });
      },
    },
  },
});
