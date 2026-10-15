import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByToken = query({
  args: { tokenId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("usageSnapshots")
      .withIndex("by_tokenId", (q) => q.eq("tokenId", args.tokenId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
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
    caller: v.optional(v.union(v.string(), v.null())),
    endpoint: v.optional(v.union(v.string(), v.null())),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("usageSnapshots", args);

    // Update totalCost on the token
    const token = await ctx.db
      .query("tokens")
      .withIndex("by_tokenId", (q) => q.eq("tokenId", args.tokenId))
      .first();

    if (token) {
      await ctx.db.patch(token._id, {
        totalCost: +(token.totalCost + args.cost).toFixed(4),
      });
    }

    return await ctx.db.get(id);
  },
});
