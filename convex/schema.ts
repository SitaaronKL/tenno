// STUB owned by slice 1. Only the two tables slice 3 writes, so codegen and tests work.
// Seam: replace this file with slice 1's full schema.
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  worldState: defineTable({
    platform: v.string(),
    fetchedAt: v.number(),
    data: v.any(),
  }).index("by_platform", ["platform"]),

  worldEvents: defineTable({
    platform: v.string(),
    kind: v.string(),
    key: v.string(),
    startsAt: v.number(),
    expiresAt: v.number(),
    seenAt: v.number(),
    payload: v.any(),
  })
    .index("by_platform_kind_key", ["platform", "kind", "key"])
    .index("by_seen", ["seenAt"]),
});
