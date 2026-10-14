import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const importSupabaseData = mutation({
  args: {
    authConfig: v.optional(
      v.object({
        passwordHash: v.string(),
        mustChangePassword: v.boolean(),
        totpSecret: v.optional(v.union(v.string(), v.null())),
      })
    ),
    providers: v.array(
      v.object({
        name: v.string(),
        slug: v.string(),
      })
    ),
    tokens: v.array(
      v.object({
        tokenId: v.string(),
        name: v.string(),
        slug: v.string(),
        provider: v.string(),
        encryptedValue: v.string(),
        quota: v.number(),
        totalCost: v.number(),
        revealSecretHash: v.optional(v.union(v.string(), v.null())),
        active: v.boolean(),
        maxUsd: v.optional(v.union(v.number(), v.null())),
        tags: v.array(v.string()),
        agent: v.optional(v.union(v.string(), v.null())),
        resetAt: v.optional(v.union(v.string(), v.null())),
        publicKey: v.optional(v.union(v.string(), v.null())),
        trackingKey: v.optional(v.union(v.string(), v.null())),
        baseUrl: v.optional(v.union(v.string(), v.null())),
        notes: v.optional(v.union(v.string(), v.null())),
        createdAt: v.string(),
      })
    ),
    snapshots: v.array(
      v.object({
        snapshotId: v.string(),
        tokenId: v.string(),
        tokensUsed: v.number(),
        cost: v.number(),
        model: v.optional(v.union(v.string(), v.null())),
        inputTokens: v.number(),
        outputTokens: v.number(),
        latencyMs: v.optional(v.union(v.number(), v.null())),
        tokensPerSecond: v.optional(v.union(v.number(), v.null())),
        provider: v.optional(v.union(v.string(), v.null())),
        timestamp: v.string(),
      })
    ),
    audits: v.array(
      v.object({
        auditId: v.string(),
        tokenId: v.optional(v.union(v.string(), v.null())),
        tokenName: v.optional(v.union(v.string(), v.null())),
        action: v.string(),
        detail: v.optional(v.union(v.string(), v.null())),
        createdAt: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // 1. AuthConfig
    if (args.authConfig) {
      const existing = await ctx.db
        .query("authConfig")
        .withIndex("by_configId", (q) => q.eq("configId", "owner"))
        .first();

      const authData = {
        configId: "owner",
        passwordHash: args.authConfig.passwordHash,
        mustChangePassword: args.authConfig.mustChangePassword,
        totpSecret: args.authConfig.totpSecret ?? undefined,
      };

      if (existing) {
        await ctx.db.patch(existing._id, authData);
      } else {
        await ctx.db.insert("authConfig", authData);
      }
    }

    // 2. Providers
    for (const prov of args.providers) {
      const existing = await ctx.db
        .query("providers")
        .withIndex("by_slug", (q) => q.eq("slug", prov.slug))
        .first();
      if (!existing) {
        await ctx.db.insert("providers", { name: prov.name, slug: prov.slug });
      }
    }

    // 3. Clear demo tokens if we have real tokens to import
    if (args.tokens.length > 0) {
      const demoTokens = await ctx.db.query("tokens").collect();
      for (const t of demoTokens) {
        if (t.tokenId.startsWith("tok_00")) {
          await ctx.db.delete(t._id);
        }
      }
    }

    // 4. Tokens
    for (const tok of args.tokens) {
      const existing = await ctx.db
        .query("tokens")
        .withIndex("by_tokenId", (q) => q.eq("tokenId", tok.tokenId))
        .first();

      const tokData = {
        tokenId: tok.tokenId,
        name: tok.name,
        slug: tok.slug,
        provider: tok.provider,
        encryptedValue: tok.encryptedValue,
        quota: tok.quota,
        totalCost: tok.totalCost,
        revealSecretHash: tok.revealSecretHash ?? undefined,
        active: tok.active,
        maxUsd: tok.maxUsd,
        tags: tok.tags,
        agent: tok.agent,
        resetAt: tok.resetAt,
        publicKey: tok.publicKey,
        trackingKey: tok.trackingKey,
        baseUrl: tok.baseUrl,
        notes: tok.notes,
        createdAt: tok.createdAt,
      };

      if (existing) {
        await ctx.db.patch(existing._id, tokData);
      } else {
        await ctx.db.insert("tokens", tokData);
      }
    }

    // 5. Usage Snapshots
    for (const snap of args.snapshots) {
      const existing = await ctx.db
        .query("usageSnapshots")
        .filter((q) => q.eq(q.field("snapshotId"), snap.snapshotId))
        .first();

      if (!existing) {
        await ctx.db.insert("usageSnapshots", {
          snapshotId: snap.snapshotId,
          tokenId: snap.tokenId,
          tokensUsed: snap.tokensUsed,
          cost: snap.cost,
          model: snap.model,
          inputTokens: snap.inputTokens,
          outputTokens: snap.outputTokens,
          latencyMs: snap.latencyMs,
          tokensPerSecond: snap.tokensPerSecond,
          provider: snap.provider,
          timestamp: snap.timestamp,
        });
      }
    }

    // 6. Audits
    for (const audit of args.audits) {
      const existing = await ctx.db
        .query("tokenAudits")
        .filter((q) => q.eq(q.field("auditId"), audit.auditId))
        .first();

      if (!existing) {
        await ctx.db.insert("tokenAudits", {
          auditId: audit.auditId,
          tokenId: audit.tokenId,
          tokenName: audit.tokenName,
          action: audit.action,
          detail: audit.detail,
          createdAt: audit.createdAt,
        });
      }
    }

    return {
      success: true,
      authImported: !!args.authConfig,
      providersCount: args.providers.length,
      tokensCount: args.tokens.length,
      snapshotsCount: args.snapshots.length,
      auditsCount: args.audits.length,
    };
  },
});
