import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const getActiveTokens = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tokens")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
  },
});

export const applyGatekeeperAction = internalMutation({
  args: {
    tokenId: v.string(),
    tokenName: v.string(),
    action: v.string(),
    detail: v.string(),
    pauseToken: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.pauseToken) {
      const existing = await ctx.db
        .query("tokens")
        .withIndex("by_tokenId", (q) => q.eq("tokenId", args.tokenId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { active: false });
      }
    }

    const auditId = "aud_" + Math.random().toString(36).slice(2, 10);
    await ctx.db.insert("tokenAudits", {
      auditId,
      tokenId: args.tokenId,
      tokenName: args.tokenName,
      action: args.action,
      detail: args.detail,
      createdAt: new Date().toISOString(),
    });

    return { success: true, auditId };
  },
});

export const runPeriodicMonitoring = internalAction({
  args: {},
  handler: async (ctx): Promise<any> => {
    const tokens: Array<any> = await ctx.runQuery(internal.cronsJob.getActiveTokens, {});
    const now = new Date().toISOString();
    const results: Array<{ tokenId: string; name: string; status: string; detail?: string }> = [];

    const env = (globalThis as any).process?.env || {};
    const webhookUrl: string | undefined = env.ALERT_WEBHOOK_URL || env.DISCORD_WEBHOOK_URL;

    for (const token of tokens) {
      // 1. Gatekeeper Spend Cap Check (maxUsd)
      if (typeof token.maxUsd === "number" && token.maxUsd > 0) {
        if (token.totalCost >= token.maxUsd) {
          const detail = `Límite mensual excedido ($${token.totalCost.toFixed(2)} >= $${token.maxUsd.toFixed(2)}). Token pausado automáticamente.`;
          
          await ctx.runMutation(internal.cronsJob.applyGatekeeperAction, {
            tokenId: token.tokenId,
            tokenName: token.name,
            action: "gatekeeper_auto_pause",
            detail,
            pauseToken: true,
          });

          // Send webhook notification if configured
          if (webhookUrl) {
            try {
              await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: `🚨 **[GATEKEEPER ALERT]** El token **"${token.name}"** (${token.provider}) ha sido pausado automáticamente por superar su límite mensual de **$${token.maxUsd.toFixed(2)} USD** (Gasto actual: $${token.totalCost.toFixed(2)} USD).`,
                }),
              });
            } catch (err: any) {
              console.error("Webhook alert failed:", err.message);
            }
          }

          results.push({ tokenId: token.tokenId, name: token.name, status: "auto_paused", detail });
          continue;
        } else if (token.totalCost >= token.maxUsd * 0.9) {
          // Warning at 90% threshold
          const detail = `Advertencia: 90% del límite mensual alcanzado ($${token.totalCost.toFixed(2)} de $${token.maxUsd.toFixed(2)}).`;
          
          await ctx.runMutation(internal.cronsJob.applyGatekeeperAction, {
            tokenId: token.tokenId,
            tokenName: token.name,
            action: "cap_warning",
            detail,
            pauseToken: false,
          });

          results.push({ tokenId: token.tokenId, name: token.name, status: "cap_warning", detail });
          continue;
        }
      }

      results.push({ tokenId: token.tokenId, name: token.name, status: "healthy" });
    }

    return {
      timestamp: now,
      evaluatedTokens: tokens.length,
      results,
    };
  },
});
