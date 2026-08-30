import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  vChannel as channel,
  vCycleWorld as cycleWorld,
  vDeliveryMode as deliveryMode,
  vFissureTier as fissureTier,
  vPlatform as platform,
  vRuleFilter as ruleFilter,
} from "./lib/validators";

// Validators mirror lib/contracts. The rule ones live in lib/validators.ts.
export { vRuleFilter, vRuleInput } from "./lib/validators";
export { platform, channel, deliveryMode, fissureTier, cycleWorld, ruleFilter };

const reward = v.object({ item: v.string(), count: v.number(), credits: v.number() });

const fissure = v.object({
  key: v.string(),
  node: v.string(),
  missionType: v.string(),
  enemy: v.string(),
  tier: fissureTier,
  steelPath: v.boolean(),
  storm: v.boolean(),
  startsAt: v.number(),
  expiresAt: v.number(),
});

const alert = v.object({
  key: v.string(),
  node: v.string(),
  missionType: v.string(),
  enemy: v.string(),
  rewards: v.array(reward),
  startsAt: v.number(),
  expiresAt: v.number(),
});

const invasion = v.object({
  key: v.string(),
  node: v.string(),
  description: v.string(),
  attacker: v.object({ faction: v.string(), reward: v.union(reward, v.null()) }),
  defender: v.object({ faction: v.string(), reward: v.union(reward, v.null()) }),
  completion: v.number(),
  startsAt: v.number(),
});

const sortie = v.object({
  key: v.string(),
  boss: v.string(),
  faction: v.string(),
  missions: v.array(v.object({ node: v.string(), missionType: v.string(), modifier: v.string() })),
  startsAt: v.number(),
  expiresAt: v.number(),
});

const baro = v.object({
  key: v.string(),
  location: v.string(),
  active: v.boolean(),
  startsAt: v.number(),
  expiresAt: v.number(),
  inventory: v.array(v.object({ item: v.string(), ducats: v.number(), credits: v.number() })),
});

const nightwave = v.object({
  season: v.number(),
  expiresAt: v.number(),
  acts: v.array(
    v.object({
      key: v.string(),
      title: v.string(),
      description: v.string(),
      reputation: v.number(),
      daily: v.boolean(),
      expiresAt: v.number(),
    }),
  ),
});

const cycle = v.object({ world: cycleWorld, state: v.string(), expiresAt: v.number() });

export const worldStateValidator = v.object({
  platform,
  fetchedAt: v.number(),
  fissures: v.array(fissure),
  alerts: v.array(alert),
  invasions: v.array(invasion),
  sortie: v.union(sortie, v.null()),
  archonHunt: v.union(sortie, v.null()),
  baro: v.union(baro, v.null()),
  nightwave: v.union(nightwave, v.null()),
  cycles: v.array(cycle),
});

export default defineSchema({
  ...authTables,

  profiles: defineTable({
    userId: v.id("users"),
    email: v.string(),
    phone: v.optional(v.string()),
    photonUserId: v.optional(v.string()),
    phoneVerifiedAt: v.optional(v.number()),
    timezone: v.string(),
    digestHour: v.number(),
    platform,
  }).index("by_user", ["userId"]),

  worldState: defineTable({
    platform,
    fetchedAt: v.number(),
    data: worldStateValidator,
  }).index("by_platform", ["platform"]),

  // One row per upstream entity, never updated. seenAt is the first time we saw it.
  worldEvents: defineTable({
    platform,
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
    userId: v.id("users"),
    name: v.string(),
    filter: ruleFilter,
    mode: deliveryMode,
    channels: v.array(channel),
    enabled: v.boolean(),
    source: v.union(v.literal("manual"), v.literal("ai")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_kind", ["filter.kind", "enabled"]),

  notifications: defineTable({
    userId: v.id("users"),
    ruleId: v.id("rules"),
    eventId: v.id("worldEvents"),
    channel,
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    error: v.optional(v.string()),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  })
    .index("by_rule_event", ["ruleId", "eventId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status", ["status"]),
});
