import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  authConfig: defineTable({
    configId: v.string(), // "owner"
    passwordHash: v.string(),
    mustChangePassword: v.boolean(),
    totpSecret: v.optional(v.string()),
  }).index("by_configId", ["configId"]),

  providers: defineTable({
    name: v.string(),
    slug: v.string(),
  }).index("by_slug", ["slug"]),

  tokens: defineTable({
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
    createdAt: v.string(),
  })
    .index("by_tokenId", ["tokenId"])
    .index("by_slug", ["slug"])
    .index("by_provider", ["provider"]),

  usageSnapshots: defineTable({
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
  }).index("by_tokenId", ["tokenId"]),

  tokenAudits: defineTable({
    auditId: v.string(),
    tokenId: v.optional(v.union(v.string(), v.null())),
    tokenName: v.optional(v.union(v.string(), v.null())),
    action: v.string(),
    detail: v.optional(v.union(v.string(), v.null())),
    createdAt: v.string(),
  }).index("by_tokenId", ["tokenId"]),

  appSettings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),
});
