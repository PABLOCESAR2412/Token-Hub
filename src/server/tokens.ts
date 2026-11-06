import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { loadAdapter } from "../lib/storage-adapter";
import { isAuthorized, unauthorized } from "../lib/auth";
import type { CreateTokenInput, UpdateTokenInput, TelegramSettings } from "../lib/types";
import { getTelegramConfig, sendTestTelegramAlert } from "../lib/telegram";
import { decrypt } from "../lib/crypto";
import { getProviderBySlug } from "../lib/providers";

export const unauthorizedResponse = unauthorized;

export const getTokens = createServerFn({ method: "GET" })
  .handler(async () => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.getTokens();
  });

export const setTokenActive = createServerFn({ method: "POST" })
  .validator((input: { id: string; active: boolean }) => input)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.setTokenActive(data.id, data.active);
  });

export const getAuditLog = createServerFn({ method: "GET" })
  .validator((tokenId?: string) => tokenId)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.getAuditLog(data);
  });

export const getToken = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.getToken(data);
  });

export const addToken = createServerFn({ method: "POST" })
  .validator((input: CreateTokenInput) => input)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.addToken(data);
  });

export const updateToken = createServerFn({ method: "POST" })
  .validator((input: UpdateTokenInput & { code?: string }) => input)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.updateToken(data as UpdateTokenInput, data.code);
  });

export const deleteToken = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    await adapter.deleteToken(data);
  });

export const getSnapshots = createServerFn({ method: "GET" })
  .validator((tokenId: string) => tokenId)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.getSnapshots(data);
  });

export const revealToken = createServerFn({ method: "POST" })
  .validator(
    (input: { tokenId: string; revealSecret: string; code?: string }) => input
  )
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.revealToken(data.tokenId, data.revealSecret, data.code);
  });

export const getTotpStatus = createServerFn({ method: "GET" })
  .handler(async () => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.getTotpStatus();
  });

export const setupTotp = createServerFn({ method: "POST" })
  .handler(async () => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.setupTotp();
  });

export const enableTotp = createServerFn({ method: "POST" })
  .validator(
    (input: { secret: string; code: string }) => input
  )
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.enableTotp(data.secret, data.code);
  });

export const disableTotp = createServerFn({ method: "POST" })
  .handler(async () => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.disableTotp();
  });

export const verifyTotpCode = createServerFn({ method: "POST" })
  .validator((code: string) => code)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.verifyTotpCode(data);
  });

export const addSnapshot = createServerFn({ method: "POST" })
  .validator(
    (input: { tokenId: string; tokensUsed: number; cost: number; model?: string; inputTokens?: number; outputTokens?: number }) => input
  )
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    return await adapter.addSnapshot(data.tokenId, {
      tokensUsed: data.tokensUsed,
      cost: data.cost,
      model: data.model ?? null,
      inputTokens: data.inputTokens ?? 0,
      outputTokens: data.outputTokens ?? 0,
    });
  });

export const inspectToken = createServerFn({ method: "POST" })
  .validator((tokenId: string) => tokenId)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    const token = await adapter.getToken(data);
    if (!token) throw new Error("Token no encontrado");

    const { inspectProviderKey } = await import("../lib/providers/inspector");
    const { decrypt } = await import("../lib/crypto");

    return await inspectProviderKey({
      provider: token.provider,
      apiKey: decrypt(token.encryptedValue),
      publicKey: token.publicKey ? decrypt(token.publicKey) : null,
      trackingKey: token.trackingKey ? decrypt(token.trackingKey) : null,
      baseUrl: token.baseUrl,
    });
  });

export const syncHistoricalUsage = createServerFn({ method: "POST" })
  .validator(
    (input: {
      tokenId: string;
      totalTokens?: number;
      totalCost?: number;
      model?: string;
      days?: number;
    }) => input
  )
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    if (!Number.isFinite(data.totalTokens) || (data.totalTokens ?? -1) < 0) {
      throw new Error("Indica el total real de tokens para importar.");
    }
    if (!Number.isFinite(data.totalCost) || (data.totalCost ?? -1) < 0) {
      throw new Error("Indica el costo real para importar.");
    }

    const adapter = await loadAdapter();
    const token = await adapter.getToken(data.tokenId);
    if (!token) throw new Error("Token no encontrado");

    // An aggregate total has no per-day, model, or caller breakdown. Save it once
    // with an explicit label instead of inventing a daily distribution.
    await adapter.addSnapshot(token.id, {
      tokensUsed: data.totalTokens!,
      cost: data.totalCost!,
      model: data.model ?? null,
      inputTokens: 0,
      outputTokens: 0,
      provider: token.provider,
      caller: "Importación manual (agregado)",
      endpoint: "manual://aggregate-import",
      timestamp: new Date().toISOString(),
    });

    return {
      ok: true,
      days: 1,
      totalTokens: data.totalTokens!,
      totalCost: data.totalCost!,
      message: "Totales importados como un único registro agregado; no se inventó un desglose diario.",
    };
  });
export const copyTokenKey = createServerFn({ method: "POST" })
  .validator((tokenId: string) => tokenId)
  .handler(async ({ data: tokenId }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    const token = await adapter.getToken(tokenId);
    if (!token) throw new Error("Token no encontrado");

    const { decrypt } = await import("../lib/crypto");
    let key = "";
    try {
      key = decrypt(token.encryptedValue);
    } catch {
      key = token.encryptedValue.replace(/^enc_/, "");
    }

    try {
      await adapter.addAudit({
        tokenId: token.id,
        tokenName: token.name,
        action: "copy",
        detail: "// API Key copiada al portapapeles",
      });
    } catch {}

    return { key };
  });

export const getTelegramSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    return await getTelegramConfig();
  });

export const saveTelegramSettings = createServerFn({ method: "POST" })
  .validator((input: TelegramSettings) => input)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    await adapter.saveSettings("telegram", data);
    return data;
  });

export const sendTestTelegramAlertFn = createServerFn({ method: "POST" })
  .validator((input?: { botToken?: string; chatId?: string }) => input)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    return await sendTestTelegramAlert(data);
  });

type ProviderUsageCheck = {
  ok: boolean;
  snapshotsAdded: 0;
  totalCost: number;
  message: string;
  providerUsage?: { tokensUsed: number; cost: number; period: string; tokensApproximate: boolean };
};

async function checkProviderUsage(token: {
  provider: string;
  encryptedValue: string;
  publicKey?: string | null;
  trackingKey?: string | null;
  baseUrl?: string | null;
  totalCost: number;
}): Promise<ProviderUsageCheck> {
  const provider = getProviderBySlug(token.provider);
  if (!provider) {
    return {
      ok: false,
      snapshotsAdded: 0,
      totalCost: token.totalCost,
      message: `No hay una integración de uso disponible para ${token.provider}.`,
    };
  }

  try {
    const usage = await provider.fetchUsage({
      apiKey: decrypt(token.encryptedValue),
      publicKey: token.publicKey ? decrypt(token.publicKey) : null,
      trackingKey: token.trackingKey ? decrypt(token.trackingKey) : null,
      baseUrl: token.baseUrl ?? null,
    });
    const raw = usage.raw ?? {};
    const error = typeof raw.error === "string" ? raw.error : null;
    const status = typeof raw.status === "number" ? raw.status : null;

    if (error || (status !== null && status >= 400)) {
      return {
        ok: false,
        snapshotsAdded: 0,
        totalCost: token.totalCost,
        message: error || `${provider.name} respondió HTTP ${status}.`,
      };
    }

    if (raw.usageSupported !== true) {
      return {
        ok: false,
        snapshotsAdded: 0,
        totalCost: token.totalCost,
        message: `${provider.name} no ofrece una integración verificable de consumo. Las llamadas por el Gateway sí se registran en tiempo real.`,
      };
    }

    const period = typeof raw.usagePeriod === "string" ? raw.usagePeriod : "provider_reported";
    const reportedCost = Number.isFinite(usage.cost) ? usage.cost : 0;
    const reportedTokens = Number.isFinite(usage.tokensUsed) ? usage.tokensUsed : 0;
    const tokensApproximate = raw.tokensApproximate === true;

    return {
      ok: true,
      snapshotsAdded: 0,
      totalCost: token.totalCost,
      providerUsage: {
        tokensUsed: reportedTokens,
        cost: reportedCost,
        period,
        tokensApproximate,
      },
      message: `${provider.name} reporta ${tokensApproximate ? "aproximadamente " : ""}${reportedTokens.toLocaleString()} tokens y $${reportedCost.toFixed(4)} para ${period}. Es un dato agregado del proveedor; no se suma al historial para evitar duplicados.`,
    };
  } catch (err: any) {
    return {
      ok: false,
      snapshotsAdded: 0,
      totalCost: token.totalCost,
      message: err?.message || `No se pudo consultar el uso de ${provider.name}.`,
    };
  }
}

export const syncTokenUsage = createServerFn({ method: "POST" })
  .validator((input: { tokenId: string; forceModel?: string }) => input)
  .handler(async ({ data }) => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    const token = await adapter.getToken(data.tokenId);
    if (!token) throw new Error("Token no encontrado");
    return await checkProviderUsage(token);
  });
export const syncAllTokensUsage = createServerFn({ method: "POST" })
  .handler(async () => {
    if (!isAuthorized(getRequest())) return unauthorizedResponse();
    const adapter = await loadAdapter();
    const tokens = await adapter.getTokens();
    const activeTokens = tokens.filter((t) => t.active);

    let availableCount = 0;
    let failedCount = 0;
    for (const t of activeTokens) {
      try {
        const result = await checkProviderUsage(t);
        if (result.ok) availableCount++;
        else failedCount++;
      } catch {
        failedCount++;
      }
    }

    return {
      ok: true,
      checkedCount: activeTokens.length,
      availableCount,
      failedCount,
      message: `Se consultaron ${activeTokens.length} tokens activos: ${availableCount} devolvieron uso verificable y ${failedCount} no. No se agregaron snapshots; los totales del proveedor son agregados.`,
    };
  });




