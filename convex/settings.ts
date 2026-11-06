import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireServiceSecret } from "./authz";

export const get = query({
  args: { serviceSecret: v.string(), key: v.string() },
  handler: async (ctx, args) => {
    requireServiceSecret(args.serviceSecret);
    const doc = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return doc?.value ?? null;
  },
});

export const set = mutation({
  args: {
    serviceSecret: v.string(),
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    requireServiceSecret(args.serviceSecret);
    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
      return await ctx.db.get(existing._id);
    } else {
      const id = await ctx.db.insert("appSettings", {
        key: args.key,
        value: args.value,
      });
      return await ctx.db.get(id);
    }
  },
});
