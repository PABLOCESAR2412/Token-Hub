import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireServiceSecret } from "./authz";

export const seedInitialData = mutation({
  args: { serviceSecret: v.string() },
  handler: async (ctx, args) => {
    requireServiceSecret(args.serviceSecret);
    const existingTokens = await ctx.db.query("tokens").first();
    if (existingTokens) {
      return { seeded: false, message: "La base de datos ya contiene tokens." };
    }

    const tokens = [
      {
        tokenId: "tok_001",
        name: "OpenAI GPT-4 Agent",
        slug: "openai-gpt-4-agent",
        provider: "openai",
        encryptedValue: "",
        quota: 10000,
        totalCost: 247.83,
        active: false,
        maxUsd: 100,
        tags: ["agente", "gpt"],
        agent: "Dev Agent",
        createdAt: "2026-01-15T10:30:00.000Z",
      },
      {
        tokenId: "tok_002",
        name: "Anthropic Claude Code",
        slug: "anthropic-claude-code",
        provider: "anthropic",
        encryptedValue: "",
        quota: 5000,
        totalCost: 89.12,
        active: false,
        maxUsd: 50,
        tags: ["claude"],
        agent: "Dev Agent",
        createdAt: "2026-02-03T14:20:00.000Z",
      },
      {
        tokenId: "tok_003",
        name: "OpenAI Embeddings",
        slug: "openai-embeddings",
        provider: "openai",
        encryptedValue: "",
        quota: 0,
        totalCost: 12.4,
        active: false,
        maxUsd: null,
        tags: ["embeddings"],
        agent: "ML Pipeline",
        createdAt: "2026-03-01T08:15:00.000Z",
      },
    ];

    for (const t of tokens) {
      await ctx.db.insert("tokens", t);
    }

    // Seed snapshots for tok_001, tok_002, tok_003
    const now = Date.now();
    for (let i = 0; i < 15; i++) {
      const ts = new Date(now - (15 - i) * 86400000).toISOString();
      await ctx.db.insert("usageSnapshots", {
        snapshotId: `snap_001_${i}`,
        tokenId: "tok_001",
        tokensUsed: Math.floor(200 + Math.random() * 800),
        cost: +(3 + Math.random() * 12).toFixed(2),
        inputTokens: Math.floor(100 + Math.random() * 400),
        outputTokens: Math.floor(100 + Math.random() * 400),
        provider: "openai",
        timestamp: ts,
      });
      await ctx.db.insert("usageSnapshots", {
        snapshotId: `snap_002_${i}`,
        tokenId: "tok_002",
        tokensUsed: Math.floor(50 + Math.random() * 300),
        cost: +(1 + Math.random() * 5).toFixed(2),
        inputTokens: Math.floor(25 + Math.random() * 150),
        outputTokens: Math.floor(25 + Math.random() * 150),
        provider: "anthropic",
        timestamp: ts,
      });
    }

    await ctx.db.insert("tokenAudits", {
      auditId: "aud_init",
      action: "seed",
      detail: "// Base de datos inicializada en Convex",
      createdAt: new Date().toISOString(),
    });

    return { seeded: true, count: tokens.length };
  },
});
