import { PrismaClient } from "@prisma/client";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const prisma = new PrismaClient();

const CONVEX_URLS = [
  "https://prestigious-fennec-799.convex.cloud",
  "https://proficient-raccoon-550.convex.cloud",
];

async function main() {
  console.log("Reading data from Supabase Postgres...");

  const [authRows, providers, tokens, snapshots, audits] = await Promise.all([
    prisma.authConfig.findMany(),
    prisma.provider.findMany(),
    prisma.token.findMany({ include: { provider: true } }),
    prisma.usageSnapshot.findMany(),
    prisma.tokenAudit.findMany(),
  ]);

  console.log(`Found in Supabase:
- AuthConfig: ${authRows.length} rows
- Providers: ${providers.length} rows
- Tokens: ${tokens.length} rows
- UsageSnapshots: ${snapshots.length} rows
- TokenAudits: ${audits.length} rows
`);

  const auth = authRows[0] || null;
  const authPayload = auth
    ? {
        passwordHash: auth.passwordHash,
        mustChangePassword: auth.mustChangePassword,
        totpSecret: auth.totpSecret || null,
      }
    : undefined;

  if (auth) {
    console.log("AuthConfig details:", {
      mustChangePassword: auth.mustChangePassword,
      hasTotpSecret: !!auth.totpSecret,
      totpSecretMasked: auth.totpSecret ? `${auth.totpSecret.slice(0, 4)}***` : "none",
    });
  }

  const providersPayload = providers.map((p) => ({
    name: p.name,
    slug: p.slug,
  }));

  const tokensPayload = tokens.map((t) => ({
    tokenId: t.id,
    name: t.name,
    slug: t.slug,
    provider: t.provider?.slug || t.provider?.name || "unknown",
    encryptedValue: t.encryptedValue,
    quota: t.quota,
    totalCost: t.totalCost,
    revealSecretHash: t.revealSecretHash || null,
    active: t.active,
    maxUsd: t.maxUsd ?? null,
    tags: t.tags || [],
    agent: t.agent ?? null,
    resetAt: t.resetAt ? t.resetAt.toISOString() : null,
    publicKey: t.publicKey ?? null,
    trackingKey: t.trackingKey ?? null,
    baseUrl: t.baseUrl ?? null,
    notes: t.notes ?? null,
    createdAt: t.createdAt.toISOString(),
  }));

  const snapshotsPayload = snapshots.map((s) => ({
    snapshotId: s.id,
    tokenId: s.tokenId,
    tokensUsed: s.tokensUsed,
    cost: s.cost,
    model: s.model ?? null,
    inputTokens: s.inputTokens,
    outputTokens: s.outputTokens,
    latencyMs: s.latencyMs ?? null,
    tokensPerSecond: s.tokensPerSecond ?? null,
    provider: s.provider ?? null,
    timestamp: s.timestamp.toISOString(),
  }));

  const auditsPayload = audits.map((a) => ({
    auditId: a.id,
    tokenId: a.tokenId ?? null,
    tokenName: a.tokenName ?? null,
    action: a.action,
    detail: a.detail ?? null,
    createdAt: a.createdAt.toISOString(),
  }));

  for (const url of CONVEX_URLS) {
    console.log(`Migrating data to Convex deployment: ${url}`);
    const client = new ConvexHttpClient(url);
    const result = await client.mutation(api.migration.importSupabaseData, {
      authConfig: authPayload,
      providers: providersPayload,
      tokens: tokensPayload,
      snapshots: snapshotsPayload,
      audits: auditsPayload,
    });
    console.log(`Migration result for ${url}:`, result);
  }

  console.log("Migration finished successfully!");
}

main()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
