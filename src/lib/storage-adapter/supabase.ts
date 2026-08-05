import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "../crypto";
import type { StorageAdapter, Token, UsageSnapshot, TokenWithUsage, CreateTokenInput, UpdateTokenInput } from "../types";

const prisma = new PrismaClient();

function maskKey(raw: string): string {
  if (raw.length <= 8) return "sk-***";
  return raw.slice(0, 3) + "..." + raw.slice(-4);
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
  };
}

function mapSnapshot(db: any): UsageSnapshot {
  return {
    id: db.id,
    tokenId: db.tokenId,
    tokensUsed: db.tokensUsed,
    cost: db.cost,
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
        encryptedValue: encrypted,
        quota: input.quota,
        totalCost: 0,
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

  addSnapshot: async (tokenId: string, tokensUsed: number, cost: number) => {
    const row = await prisma.usageSnapshot.create({
      data: { tokenId, tokensUsed, cost },
    });
    await prisma.token.update({
      where: { id: tokenId },
      data: { totalCost: { increment: cost } },
    });
    return mapSnapshot(row);
  },
};
