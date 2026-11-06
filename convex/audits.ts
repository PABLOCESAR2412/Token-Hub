import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireServiceSecret } from "./authz";

export const list = query({
  args: {
    serviceSecret: v.string(),
    tokenId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    requireServiceSecret(args.serviceSecret);
    if (args.tokenId) {
      return await ctx.db
        .query("tokenAudits")
        .withIndex("by_tokenId", (q) => q.eq("tokenId", args.tokenId))
        .order("desc")
        .take(100);
    }
    return await ctx.db.query("tokenAudits").order("desc").take(200);
  },
});

export const add = mutation({
  args: {
    serviceSecret: v.string(),
    auditId: v.string(),
    tokenId: v.optional(v.union(v.string(), v.null())),
    tokenName: v.optional(v.union(v.string(), v.null())),
    action: v.string(),
    detail: v.optional(v.union(v.string(), v.null())),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    requireServiceSecret(args.serviceSecret);
    const { serviceSecret: _serviceSecret, ...audit } = args;
    const id = await ctx.db.insert("tokenAudits", audit);
    return await ctx.db.get(id);
  },
});
