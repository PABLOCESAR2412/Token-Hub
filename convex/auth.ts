import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getAuthConfig = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("authConfig")
      .withIndex("by_configId", (q) => q.eq("configId", "owner"))
      .first();
  },
});

export const setAuthConfig = mutation({
  args: {
    passwordHash: v.string(),
    mustChangePassword: v.boolean(),
    totpSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("authConfig")
      .withIndex("by_configId", (q) => q.eq("configId", "owner"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        passwordHash: args.passwordHash,
        mustChangePassword: args.mustChangePassword,
        ...(args.totpSecret !== undefined ? { totpSecret: args.totpSecret } : {}),
      });
      return await ctx.db.get(existing._id);
    } else {
      const id = await ctx.db.insert("authConfig", {
        configId: "owner",
        passwordHash: args.passwordHash,
        mustChangePassword: args.mustChangePassword,
        totpSecret: args.totpSecret,
      });
      return await ctx.db.get(id);
    }
  },
});

export const ensureAuthRow = mutation({
  args: {
    defaultHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("authConfig")
      .withIndex("by_configId", (q) => q.eq("configId", "owner"))
      .first();

    if (!existing) {
      await ctx.db.insert("authConfig", {
        configId: "owner",
        passwordHash: args.defaultHash,
        mustChangePassword: true,
      });
      return { passwordHash: args.defaultHash, mustChangePassword: true };
    }

    if (existing.passwordHash === "pending") {
      await ctx.db.patch(existing._id, {
        passwordHash: args.defaultHash,
        mustChangePassword: true,
      });
      return { passwordHash: args.defaultHash, mustChangePassword: true };
    }

    return {
      passwordHash: existing.passwordHash,
      mustChangePassword: existing.mustChangePassword,
      totpSecret: existing.totpSecret,
    };
  },
});
