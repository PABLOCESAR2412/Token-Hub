import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "../crypto";
import { hashRevealSecret, verifyRevealSecret } from "../reveal";
import { generateTotpSecret, verifyTotp } from "../totp";
import type { StorageAdapter, Token, UsageSnapshot, TokenWithUsage, CreateTokenInput, UpdateTokenInput, UsageSnapshotInput } from "./index";

const prisma = new PrismaClient();

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

function mapToken(db: any): Token {
  return {
    id: db.id,
    name: db.name,
    provider: db.provider?.name || "unknown",
    encryptedValue: db.encryptedValue,
    maskedValue: maskKey(decrypt(db.encryptedValue)),
    quota: db.quota,
    totalCost: db.totalCost,
    createdAt: db.createdAt.toISOString(),
    hasRevealSecret: !!db.revealSecretHash,
    hasTotp: !!db.totpSecret,
    resetAt: db.resetAt ? db.resetAt.toISOString() : null,
    hasPublicKey: !!db.publicKey,
    hasTrackingKey: !!db.trackingKey,
    publicKey: db.publicKey ?? undefined,
    trackingKey: db.trackingKey ?? undefined,
    publicKeyMasked: db.publicKey ? maskKey(decrypt(db.publicKey)) : null,
    trackingKeyMasked: db.trackingKey ? maskKey(decrypt(db.trackingKey)) : null,
    baseUrl: db.baseUrl ?? null,
    notes: db.notes ?? null,
  };
}

function mapSnapshot(db: any): UsageSnapshot {
  return {
    id: db.id,
    tokenId: db.tokenId,
    tokensUsed: db.tokensUsed,
    cost: db.cost,
    model: db.model,
    inputTokens: db.inputTokens,
    outputTokens: db.outputTokens,
    latencyMs: db.latencyMs,
    tokensPerSecond: db.tokensPerSecond,
    provider: db.provider,
    timestamp: db.timestamp.toISOString(),
  };
}

export const supabaseAdapter: StorageAdapter = {
  getTokens: async () => {
    const rows = await prisma.token.findMany({
      include: { provider: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapToken);
  },

  getToken: async (id: string) => {
    const row = await prisma.token.findUnique({
      where: { id },
      include: { provider: true, snapshots: { orderBy: { timestamp: "desc" } } },
    });
    if (!row) return null;
    return { ...mapToken(row), snapshots: row.snapshots.map(mapSnapshot) };
  },

  addToken: async (input: CreateTokenInput) => {
    const provider = await prisma.provider.upsert({
      where: { name: input.provider },
      update: {},
      create: { name: input.provider, slug: input.provider.toLowerCase().replace(/\s+/g, "-") },
    });
    const encrypted = encrypt(input.apiKey);
    const row = await prisma.token.create({
      data: {
        name: input.name,
        slug: (input.slug || slugify(input.name)) + "-" + Date.now().toString(36),
        encryptedValue: encrypted,
        quota: input.quota,
        totalCost: 0,
        revealSecretHash: input.revealSecret ? await hashRevealSecret(input.revealSecret) : null,
        publicKey: input.publicKey ? encrypt(input.publicKey) : null,
        trackingKey: input.trackingKey ? encrypt(input.trackingKey) : null,
        baseUrl: input.baseUrl ?? null,
        notes: input.notes ?? null,
        providerId: provider.id,
      },
      include: { provider: true },
    });
    return mapToken(row);
  },

  updateToken: async (input: UpdateTokenInput) => {
    const data: Record<string, any> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.quota !== undefined) data.quota = input.quota;
    if (input.apiKey !== undefined) data.encryptedValue = encrypt(input.apiKey);
    if (input.revealSecret !== undefined) data.revealSecretHash = await hashRevealSecret(input.revealSecret);
    if (input.publicKey !== undefined) data.publicKey = input.publicKey ? encrypt(input.publicKey) : null;
    if (input.trackingKey !== undefined) data.trackingKey = input.trackingKey ? encrypt(input.trackingKey) : null;
    if (input.baseUrl !== undefined) data.baseUrl = input.baseUrl ?? null;
    if (input.notes !== undefined) data.notes = input.notes ?? null;
    if (input.provider !== undefined) {
      const provider = await prisma.provider.upsert({
        where: { name: input.provider },
        update: {},
        create: { name: input.provider, slug: input.provider.toLowerCase().replace(/\s+/g, "-") },
      });
      data.providerId = provider.id;
    }
    const row = await prisma.token.update({
      where: { id: input.id },
      data,
      include: { provider: true },
    });
    return mapToken(row);
  },

  deleteToken: async (id: string) => {
    await prisma.token.delete({ where: { id } });
  },

  getSnapshots: async (tokenId: string) => {
    const rows = await prisma.usageSnapshot.findMany({
      where: { tokenId },
      orderBy: { timestamp: "desc" },
    });
    return rows.map(mapSnapshot);
  },

  addSnapshot: async (tokenId: string, usage: UsageSnapshotInput) => {
    const row = await prisma.usageSnapshot.create({
      data: {
        tokenId,
        tokensUsed: usage.tokensUsed,
        cost: usage.cost,
        model: usage.model ?? null,
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        latencyMs: usage.latencyMs ?? null,
        tokensPerSecond: usage.tokensPerSecond ?? null,
        provider: usage.provider ?? null,
        timestamp: usage.timestamp ?? new Date().toISOString(),
      },
    });
    await prisma.token.update({
      where: { id: tokenId },
      data: { totalCost: { increment: usage.cost } },
    });
    return mapSnapshot(row);
  },

  revealToken: async (tokenId: string, revealSecret: string, code?: string) => {
    const row = await prisma.token.findUnique({ where: { id: tokenId } });
    if (!row) return { ok: false, error: "Token no encontrado" };
    if (!(await verifyRevealSecret(revealSecret, row.revealSecretHash))) {
      return { ok: false, error: "// Clave incorrecta" };
    }
    if (row.totpSecret) {
      if (!code) return { ok: false, error: "// Se requiere el codigo 2FA" };
      const valid = await verifyTotp(row.totpSecret, code);
      if (!valid) return { ok: false, error: "// Codigo 2FA incorrecto" };
    }
    return {
      ok: true,
      key: decrypt(row.encryptedValue),
      publicKey: row.publicKey ? decrypt(row.publicKey) : null,
      trackingKey: row.trackingKey ? decrypt(row.trackingKey) : null,
      baseUrl: row.baseUrl ?? null,
      notes: row.notes ?? null,
    };
  },

  setupTotp: async (tokenId: string) => {
    const row = await prisma.token.findUnique({ where: { id: tokenId } });
    if (!row) throw new Error("Token no encontrado");
    return generateTotpSecret(row.name || "token");
  },

  enableTotp: async (tokenId: string, secret: string, code: string) => {
    const row = await prisma.token.findUnique({ where: { id: tokenId } });
    if (!row) return { ok: false, error: "Token no encontrado" };
    const valid = await verifyTotp(secret, code);
    if (!valid) return { ok: false, error: "// Codigo 2FA incorrecto" };
    await prisma.token.update({ where: { id: tokenId }, data: { totpSecret: secret } });
    return { ok: true };
  },

  disableTotp: async (tokenId: string) => {
    await prisma.token.update({ where: { id: tokenId }, data: { totpSecret: null } });
    return { ok: true };
  },
};