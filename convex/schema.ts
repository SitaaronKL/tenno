// STUB owned by slice 1. Only the tables slice 4 reads and writes, mirroring docs/CONTRACT.md.
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const ruleFilter = v.any();

export default defineSchema({
  profiles: defineTable({
    userId: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    photonUserId: v.optional(v.string()),
    phoneVerifiedAt: v.optional(v.number()),
    timezone: v.string(),
    digestHour: v.number(),
    platform: v.literal("pc"),
  }).index("by_user", ["userId"]),

  worldEvents: defineTable({
    platform: v.string(),
    kind: v.string(),
    key: v.string(),
    startsAt: v.number(),
    expiresAt: v.optional(v.number()),
    seenAt: v.number(),
    payload: v.any(),
  })
    .index("by_platform_kind_key", ["platform", "kind", "key"])
    .index("by_seen", ["seenAt"]),

  rules: defineTable({
    userId: v.string(),
    name: v.string(),
    filter: ruleFilter,
    mode: v.union(v.literal("instant"), v.literal("digest")),
    channels: v.array(v.union(v.literal("email"), v.literal("imessage"))),
    enabled: v.boolean(),
    source: v.union(v.literal("manual"), v.literal("ai")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_kind", ["filter.kind", "enabled"]),

  notifications: defineTable({
    userId: v.string(),
    ruleId: v.id("rules"),
    eventId: v.id("worldEvents"),
    channel: v.union(v.literal("email"), v.literal("imessage")),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"), v.literal("skipped")),
    error: v.optional(v.string()),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  })
    .index("by_rule_event", ["ruleId", "eventId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status", ["status"]),
});
