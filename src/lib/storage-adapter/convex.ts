import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { encrypt, decrypt } from "../crypto";
import { hashRevealSecret, verifyRevealSecret } from "../reveal";
import { generateTotpSecret, verifyTotp } from "../totp";
import type {
  StorageAdapter,
  Token,
  UsageSnapshot,
  TokenWithUsage,
  CreateTokenInput,
  UpdateTokenInput,
  UsageSnapshotInput,
  TokenAudit,
  RevealResult,
  TotpSetupResult,
} from "./index";

function getConvexUrl(): string {
  return (
    process.env.PROYECT_CONVEX_URL ||
    process.env.PROJECT_CONVEX_URL ||
    process.env.VITE_CONVEX_URL ||
    process.env.CONVEX_URL ||
    "http://127.0.0.1:3210"
  );
}

function getConvexClient(): ConvexHttpClient {
  return new ConvexHttpClient(getConvexUrl());
}

function maskKey(raw: string): string {
  if (raw.length <= 8) return "sk-***";
  return raw.slice(0, 3) + "..." + raw.slice(-4);
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "token"
  );
}

async function getGlobalTotpSecret(): Promise<string | null> {
  try {
    const convex = getConvexClient();
    const config = await convex.query(api.auth.getAuthConfig);
    return config?.totpSecret ?? null;
  } catch {
    return null;
  }
}

async function getGlobalTotpStatus(): Promise<{ enabled: boolean }> {
  return { enabled: !!(await getGlobalTotpSecret()) };
}

async function requireGlobalCode(code?: string): Promise<{ ok: boolean; error?: string }> {
  const secret = await getGlobalTotpSecret();
  if (!secret) return { ok: true };
  if (!code) return { ok: false, error: "// Se requiere el codigo 2FA" };
  const valid = await verifyTotp(secret, code);
  if (!valid) return { ok: false, error: "// Codigo 2FA incorrecto" };
  return { ok: true };
}

async function mapToken(db: any): Promise<Token> {
  const totp = await getGlobalTotpStatus();
  let decryptedValue = "";
  try {
    decryptedValue = decrypt(db.encryptedValue);
  } catch {
    decryptedValue = db.encryptedValue.replace(/^enc_/, "");
  }

  let pubMasked: string | null = null;
  if (db.publicKey) {
    try {
      pubMasked = maskKey(decrypt(db.publicKey));
    } catch {
      pubMasked = maskKey(db.publicKey);
    }
  }

  let trkMasked: string | null = null;
  if (db.trackingKey) {
    try {
      trkMasked = maskKey(decrypt(db.trackingKey));
    } catch {
      trkMasked = maskKey(db.trackingKey);
    }
  }

  return {
    id: db.tokenId,
    name: db.name,
    provider: db.provider || "unknown",
    encryptedValue: db.encryptedValue,
    maskedValue: maskKey(decryptedValue),
    quota: db.quota,
    totalCost: db.totalCost,
    createdAt: db.createdAt || new Date(db._creationTime).toISOString(),
    hasRevealSecret: !!db.revealSecretHash,
    hasTotp: totp.enabled,
    resetAt: db.resetAt ?? null,
    hasPublicKey: !!db.publicKey,
    hasTrackingKey: !!db.trackingKey,
    publicKey: db.publicKey ?? undefined,
    trackingKey: db.trackingKey ?? undefined,
    publicKeyMasked: pubMasked,
    trackingKeyMasked: trkMasked,
    baseUrl: db.baseUrl ?? null,
    notes: db.notes ?? null,
    active: db.active ?? true,
    maxUsd: db.maxUsd ?? null,
    tags: db.tags ?? [],
    agent: db.agent ?? null,
  };
}

function mapSnapshot(db: any): UsageSnapshot {
  return {
    id: db.snapshotId,
    tokenId: db.tokenId,
    tokensUsed: db.tokensUsed,
    cost: db.cost,
    model: db.model ?? null,
    inputTokens: db.inputTokens ?? 0,
    outputTokens: db.outputTokens ?? 0,
    latencyMs: db.latencyMs ?? null,
    tokensPerSecond: db.tokensPerSecond ?? null,
    provider: db.provider ?? null,
    timestamp: db.timestamp || new Date(db._creationTime).toISOString(),
  };
}

function mapAudit(db: any): TokenAudit {
  return {
    id: db.auditId,
    tokenId: db.tokenId ?? null,
    tokenName: db.tokenName ?? null,
    action: db.action,
    detail: db.detail ?? null,
    createdAt: db.createdAt || new Date(db._creationTime).toISOString(),
  };
}

async function callConvex<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes("ConnectionRefused") || msg.includes("Unable to connect") || msg.includes("Failed to fetch")) {
      throw new Error(`// No se pudo conectar a Convex. Verifica que PROYECT_CONVEX_URL esté configurado o ejecuta 'npx convex dev'.`);
    }
    throw err;
  }
}

export const convexAdapter: StorageAdapter = {
  getTokens: async () => {
    return await callConvex(async () => {
      const convex = getConvexClient();
      const rows = await convex.query(api.tokens.list);
      return await Promise.all(rows.map(mapToken));
    });
  },

  getToken: async (id: string) => {
    return await callConvex(async () => {
      const convex = getConvexClient();
      const token = await convex.query(api.tokens.get, { tokenId: id });
      if (!token) return null;
      const mapped = await mapToken(token);
      return {
        ...mapped,
        snapshots: (token.snapshots || []).map(mapSnapshot),
      };
    });
  },

  addToken: async (input: CreateTokenInput) => {
    const convex = getConvexClient();
    const tokenId = "tok_" + crypto.randomUUID().slice(0, 8);
    const slug = slugify(input.name) + "-" + crypto.randomUUID().slice(0, 4);
    const createdAt = new Date().toISOString();

    const created = await convex.mutation(api.tokens.create, {
      tokenId,
      name: input.name,
      slug,
      provider: input.provider,
      encryptedValue: encrypt(input.apiKey),
      quota: input.quota,
      totalCost: 0,
      active: true,
      tags: input.tags ?? [],
      agent: input.agent ?? null,
      maxUsd: input.maxUsd ?? null,
      revealSecretHash: input.revealSecret ? await hashRevealSecret(input.revealSecret) : undefined,
      publicKey: input.publicKey ? encrypt(input.publicKey) : null,
      trackingKey: input.trackingKey ? encrypt(input.trackingKey) : null,
      baseUrl: input.baseUrl ?? null,
      notes: input.notes ?? null,
      createdAt,
    });

    await convex.mutation(api.audits.add, {
      auditId: "aud_" + crypto.randomUUID().slice(0, 8),
      tokenId,
      tokenName: input.name,
      action: "create",
      detail: "// Token creado",
      createdAt,
    });

    return await mapToken(created);
  },

  updateToken: async (input: UpdateTokenInput, code?: string) => {
    const gate = await requireGlobalCode(code);
    if (!gate.ok) throw new Error(gate.error);

    const convex = getConvexClient();
    const patches: any = { tokenId: input.id };

    if (input.name !== undefined) patches.name = input.name;
    if (input.provider !== undefined) patches.provider = input.provider;
    if (input.quota !== undefined) patches.quota = input.quota;
    if (input.apiKey !== undefined) patches.encryptedValue = encrypt(input.apiKey);
    if (input.revealSecret !== undefined) patches.revealSecretHash = await hashRevealSecret(input.revealSecret);
    if (input.publicKey !== undefined) patches.publicKey = input.publicKey ? encrypt(input.publicKey) : null;
    if (input.trackingKey !== undefined) patches.trackingKey = input.trackingKey ? encrypt(input.trackingKey) : null;
    if (input.baseUrl !== undefined) patches.baseUrl = input.baseUrl ?? null;
    if (input.notes !== undefined) patches.notes = input.notes ?? null;
    if (input.active !== undefined) patches.active = input.active;
    if (input.maxUsd !== undefined) patches.maxUsd = input.maxUsd ?? null;
    if (input.tags !== undefined) patches.tags = input.tags;
    if (input.agent !== undefined) patches.agent = input.agent ?? null;

    const updated = await convex.mutation(api.tokens.update, patches);

    await convex.mutation(api.audits.add, {
      auditId: "aud_" + crypto.randomUUID().slice(0, 8),
      tokenId: input.id,
      tokenName: updated.name,
      action: "update",
      detail: "// Token actualizado",
      createdAt: new Date().toISOString(),
    });

    return await mapToken(updated);
  },

  deleteToken: async (id: string) => {
    const convex = getConvexClient();
    await convex.mutation(api.tokens.remove, { tokenId: id });
  },

  getSnapshots: async (tokenId: string) => {
    const convex = getConvexClient();
    const rows = await convex.query(api.snapshots.listByToken, { tokenId });
    return rows.map(mapSnapshot);
  },

  addSnapshot: async (tokenId: string, usage: UsageSnapshotInput) => {
    const convex = getConvexClient();
    const snapshotId = "snap_" + crypto.randomUUID().slice(0, 8);
    const timestamp = usage.timestamp ?? new Date().toISOString();

    const created = await convex.mutation(api.snapshots.add, {
      snapshotId,
      tokenId,
      tokensUsed: usage.tokensUsed,
      cost: usage.cost,
      model: usage.model ?? null,
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      latencyMs: usage.latencyMs ?? null,
      tokensPerSecond: usage.tokensPerSecond ?? null,
      provider: usage.provider ?? null,
      timestamp,
    });

    return mapSnapshot(created);
  },

  revealToken: async (tokenId: string, revealSecret: string, code?: string): Promise<RevealResult> => {
    const convex = getConvexClient();
    const token = await convex.query(api.tokens.get, { tokenId });
    if (!token) return { ok: false, error: "Token no encontrado" };

    if (token.revealSecretHash) {
      const match = await verifyRevealSecret(revealSecret, token.revealSecretHash);
      if (!match) return { ok: false, error: "// Clave incorrecta" };
    }

    const gate = await requireGlobalCode(code);
    if (!gate.ok) return { ok: false, error: gate.error };

    let key = "";
    try {
      key = decrypt(token.encryptedValue);
    } catch {
      key = token.encryptedValue.replace(/^enc_/, "");
    }

    let publicKey: string | null = null;
    if (token.publicKey) {
      try {
        publicKey = decrypt(token.publicKey);
      } catch {
        publicKey = token.publicKey;
      }
    }

    let trackingKey: string | null = null;
    if (token.trackingKey) {
      try {
        trackingKey = decrypt(token.trackingKey);
      } catch {
        trackingKey = token.trackingKey;
      }
    }

    await convex.mutation(api.audits.add, {
      auditId: "aud_" + crypto.randomUUID().slice(0, 8),
      tokenId: token.tokenId,
      tokenName: token.name,
      action: "reveal",
      detail: "// API key revelada",
      createdAt: new Date().toISOString(),
    });

    return {
      ok: true,
      key,
      publicKey,
      trackingKey,
      baseUrl: token.baseUrl ?? null,
      notes: token.notes ?? null,
    };
  },

  getTotpStatus: () => getGlobalTotpStatus(),

  setupTotp: async (): Promise<TotpSetupResult> => {
    return generateTotpSecret("owner@agent-token-hub");
  },

  enableTotp: async (secret: string, code: string): Promise<RevealResult> => {
    const valid = await verifyTotp(secret, code);
    if (!valid) return { ok: false, error: "// Codigo 2FA incorrecto" };

    const convex = getConvexClient();
    const current = await convex.query(api.auth.getAuthConfig);

    await convex.mutation(api.auth.setAuthConfig, {
      passwordHash: current?.passwordHash || "pending",
      mustChangePassword: current?.mustChangePassword ?? true,
      totpSecret: secret,
    });

    return { ok: true };
  },

  disableTotp: async (): Promise<RevealResult> => {
    const convex = getConvexClient();
    const current = await convex.query(api.auth.getAuthConfig);

    await convex.mutation(api.auth.setAuthConfig, {
      passwordHash: current?.passwordHash || "pending",
      mustChangePassword: current?.mustChangePassword ?? true,
      totpSecret: undefined,
    });

    return { ok: true };
  },

  verifyTotpCode: async (code: string): Promise<boolean> => {
    const secret = await getGlobalTotpSecret();
    if (!secret) return false;
    return verifyTotp(secret, code);
  },

  setTokenActive: async (id: string, active: boolean) => {
    const convex = getConvexClient();
    const updated = await convex.mutation(api.tokens.setActive, { tokenId: id, active });

    await convex.mutation(api.audits.add, {
      auditId: "aud_" + crypto.randomUUID().slice(0, 8),
      tokenId: id,
      tokenName: updated.name,
      action: active ? "activate" : "pause",
      detail: active ? "// Token activado" : "// Token pausado",
      createdAt: new Date().toISOString(),
    });

    return await mapToken(updated);
  },

  getAuditLog: async (tokenId?: string) => {
    const convex = getConvexClient();
    const rows = await convex.query(api.audits.list, { tokenId: tokenId ?? null });
    return rows.map(mapAudit);
  },

  addAudit: async (entry) => {
    const convex = getConvexClient();
    await convex.mutation(api.audits.add, {
      auditId: "aud_" + crypto.randomUUID().slice(0, 8),
      tokenId: entry.tokenId ?? null,
      tokenName: entry.tokenName ?? null,
      action: entry.action,
      detail: entry.detail ?? null,
      createdAt: new Date().toISOString(),
    });
  },
};
