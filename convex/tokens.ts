import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tokens").order("desc").collect();
  },
});

export const get = query({
  args: { tokenId: v.string() },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("tokens")
      .withIndex("by_tokenId", (q) => q.eq("tokenId", args.tokenId))
      .first();

    if (!token) return null;

    const snapshots = await ctx.db
      .query("usageSnapshots")
      .withIndex("by_tokenId", (q) => q.eq("tokenId", args.tokenId))
      .order("desc")
      .collect();

    return { ...token, snapshots };
  },
});

export const create = mutation({
  args: {
    tokenId: v.string(),
    name: v.string(),
    slug: v.string(),
    provider: v.string(),
    encryptedValue: v.string(),
    quota: v.number(),
    totalCost: v.number(),
    revealSecretHash: v.optional(v.string()),
    active: v.boolean(),
    maxUsd: v.optional(v.union(v.number(), v.null())),
    tags: v.array(v.string()),
    agent: v.optional(v.union(v.string(), v.null())),
    resetAt: v.optional(v.union(v.string(), v.null())),
    publicKey: v.optional(v.union(v.string(), v.null())),
    trackingKey: v.optional(v.union(v.string(), v.null())),
    baseUrl: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
    fallbackTokenId: v.optional(v.union(v.string(), v.null())),
    planId: v.optional(v.union(v.string(), v.null())),
    selectedModels: v.optional(v.union(v.array(v.string()), v.null())),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("tokens", args);
    return await ctx.db.get(id);
  },
});

export const update = mutation({
  args: {
    tokenId: v.string(),
    name: v.optional(v.string()),
    provider: v.optional(v.string()),
    quota: v.optional(v.number()),
    encryptedValue: v.optional(v.string()),
    revealSecretHash: v.optional(v.string()),
    publicKey: v.optional(v.union(v.string(), v.null())),
    trackingKey: v.optional(v.union(v.string(), v.null())),
    baseUrl: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
    fallbackTokenId: v.optional(v.union(v.string(), v.null())),
    planId: v.optional(v.union(v.string(), v.null())),
    selectedModels: v.optional(v.union(v.array(v.string()), v.null())),
    active: v.optional(v.boolean()),
    maxUsd: v.optional(v.union(v.number(), v.null())),
    tags: v.optional(v.array(v.string())),
    agent: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("tokens")
      .withIndex("by_tokenId", (q) => q.eq("tokenId", args.tokenId))
      .first();

    if (!token) throw new Error("Token not found");

    const { tokenId, ...patches } = args;
    await ctx.db.patch(token._id, patches);
    return await ctx.db.get(token._id);
  },
});

export const setActive = mutation({
  args: {
    tokenId: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("tokens")
      .withIndex("by_tokenId", (q) => q.eq("tokenId", args.tokenId))
      .first();

    if (!token) throw new Error("Token not found");

    await ctx.db.patch(token._id, { active: args.active });
    return await ctx.db.get(token._id);
  },
});

export const remove = mutation({
  args: { tokenId: v.string() },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("tokens")
      .withIndex("by_tokenId", (q) => q.eq("tokenId", args.tokenId))
      .first();

    if (token) {
      await ctx.db.delete(token._id);
    }

    const snapshots = await ctx.db
      .query("usageSnapshots")
      .withIndex("by_tokenId", (q) => q.eq("tokenId", args.tokenId))
      .collect();

    for (const snap of snapshots) {
      await ctx.db.delete(snap._id);
    }
  },
});
