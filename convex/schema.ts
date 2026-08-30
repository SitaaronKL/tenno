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
  vSource as source,
} from "./lib/validators";

// Validators mirror lib/contracts. The rule ones live in lib/validators.ts.
export { vRuleFilter, vRuleInput } from "./lib/validators";
export { platform, channel, deliveryMode, fissureTier, cycleWorld, ruleFilter, source };

// round2-mastery: what kind of thing a mastery item is, drives the table filters.
export const masteryKind = v.union(
  v.literal("warframe"),
  v.literal("primary"),
  v.literal("secondary"),
  v.literal("melee"),
  v.literal("companion"),
  v.literal("archwing"),
  v.literal("other"),
);

// builds: DE's polarity ids, named the way the game names them.
export const polarity = v.union(
  v.literal("madurai"),
  v.literal("vazarin"),
  v.literal("naramon"),
  v.literal("zenurik"),
  v.literal("unairu"),
  v.literal("penjaga"),
  v.literal("umbra"),
  v.literal("universal"),
  v.literal("any"),
);

// builds: which grid a mod belongs in. Auras and exilus mods only fit their own slot.
export const modSlot = v.union(
  v.literal("mod"),
  v.literal("exilus"),
  v.literal("aura"),
  v.literal("arcane"),
);

// builds: what a stat effect moves, the nine numbers the frame preview shows.
export const statKey = v.union(
  v.literal("health"),
  v.literal("shield"),
  v.literal("armor"),
  v.literal("energy"),
  v.literal("sprint"),
  v.literal("duration"),
  v.literal("efficiency"),
  v.literal("range"),
  v.literal("strength"),
);

export const modRef = v.object({ uniqueName: v.string(), rank: v.number() });

// builds: one frame or weapon's loadout. Eight mod slots plus aura, exilus, arcanes and shards.
export const buildSlots = v.object({
  aura: v.union(modRef, v.null()),
  exilus: v.union(modRef, v.null()),
  // Always eight entries, a null is an empty slot, so a slot keeps its index.
  mods: v.array(v.union(modRef, v.null())),
  arcanes: v.array(modRef),
  shards: v.array(v.object({ color: v.string(), count: v.number() })),
  // Forma is what puts a polarity on a slot, so the editor stores where it went.
  polarities: v.object({
    aura: v.union(polarity, v.null()),
    exilus: v.union(polarity, v.null()),
    mods: v.array(v.union(polarity, v.null())),
  }),
});

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

const bounty = v.object({
  syndicate: v.string(),
  node: v.string(),
  expiresAt: v.number(),
  jobs: v.array(
    v.object({
      level: v.string(),
      minLevel: v.number(),
      maxLevel: v.number(),
      standing: v.number(),
      rewards: v.array(v.string()),
      // Optional because a job path DE does not name leaves it out.
      missionType: v.optional(v.string()),
      // Optional, only a fixed board names its jobs beyond the level.
      title: v.optional(v.string()),
      // Optional, the node and the bonus objective come from the browse.wf rotation.
      node: v.optional(v.string()),
      challenge: v.optional(v.string()),
      // Optional, only a fixed board carries drop chances.
      rewardTable: v.optional(
        v.array(
          v.object({
            rotation: v.string(),
            rewards: v.array(v.object({ item: v.string(), chance: v.number() })),
          }),
        ),
      ),
    }),
  ),
  // Optional so boards stored before fixed boards existed still validate.
  static: v.optional(v.boolean()),
  // Optional, only a fixed board knows which reward rotation it is on.
  rotation: v.optional(v.string()),
});

export const bountyCycleValidator = v.object({
  expiry: v.number(),
  rot: v.string(),
  vaultRot: v.string(),
  zarimanFaction: v.string(),
  bounties: v.record(
    v.string(),
    v.array(v.object({ node: v.string(), challenge: v.string(), ally: v.optional(v.string()) })),
  ),
});

const archimedea = v.object({
  key: v.string(),
  variant: v.union(v.literal("deep"), v.literal("temporal")),
  expiresAt: v.number(),
  missions: v.array(
    v.object({
      missionType: v.string(),
      // Optional, DE ships no star chart node for an Archimedea mission.
      node: v.optional(v.string()),
      deviation: v.string(),
      risks: v.array(v.string()),
    }),
  ),
  personalModifiers: v.array(v.string()),
  // Optional, only a payload that draws an elite distinction carries it.
  eliteBonus: v.optional(v.array(v.string())),
});

const cycle = v.object({
  world: cycleWorld,
  state: v.string(),
  // Optional so cycles stored before the start time existed still validate.
  startsAt: v.optional(v.number()),
  expiresAt: v.number(),
});

const arbitration = v.object({
  node: v.string(),
  missionType: v.string(),
  faction: v.string(),
  tier: v.string(),
  expiresAt: v.number(),
});

const circuit = v.object({
  normal: v.array(v.string()),
  steelPath: v.array(v.string()),
  expiresAt: v.number(),
});

const darvo = v.object({
  item: v.string(),
  discount: v.number(),
  stock: v.number(),
  expiresAt: v.number(),
});

const gameEvent = v.object({ key: v.string(), name: v.string(), expiresAt: v.number() });

export const worldStateValidator = v.object({
  platform,
  fetchedAt: v.number(),
  // Optional so world state rows written before the DE fallback still validate.
  source: v.optional(source),
  upstreamTimestamp: v.number(),
  stale: v.boolean(),
  fissures: v.array(fissure),
  alerts: v.array(alert),
  invasions: v.array(invasion),
  sortie: v.union(sortie, v.null()),
  archonHunt: v.union(sortie, v.null()),
  baro: v.union(baro, v.null()),
  nightwave: v.union(nightwave, v.null()),
  cycles: v.array(cycle),
  // Optional so world state rows written before bounties existed still validate.
  bounties: v.optional(v.array(bounty)),
  // Optional so world state rows written before Archimedea existed still validate.
  archimedea: v.optional(v.array(archimedea)),
  // Optional so world state rows written before the daily and weekly extras still validate.
  incursions: v.optional(v.array(v.string())),
  arbitration: v.optional(v.union(arbitration, v.null())),
  circuit: v.optional(v.union(circuit, v.null())),
  darvo: v.optional(v.union(darvo, v.null())),
  events: v.optional(v.array(gameEvent)),
  // Optional so world state rows written before the browse.wf rotation existed still validate.
  bountyCycle: v.optional(bountyCycleValidator),
});

export default defineSchema({
  ...authTables,

  profiles: defineTable({
    userId: v.id("users"),
    email: v.string(),
    phone: v.optional(v.string()),
    photonUserId: v.optional(v.string()),
    photonSpaceId: v.optional(v.string()),
    phoneVerifiedAt: v.optional(v.number()),
    // The Warframe account this user synced. Mastery is read through it, never through an argument.
    masteryPlayerId: v.optional(v.string()),
    lastDigestAt: v.optional(v.number()),
    // World state pieces this user turned off, keys from lib/contracts/preferences.ts.
    hidden: v.optional(v.array(v.string())),
    timezone: v.string(),
    digestHour: v.number(),
    platform,
  })
    .index("by_user", ["userId"])
    .index("by_phone", ["phone"]),

  // One row per inbound Photon message, so a redelivery is answered once.
  photonInbound: defineTable({
    messageId: v.string(),
    receivedAt: v.number(),
  })
    .index("by_message", ["messageId"])
    // A dedupe row is only useful while a redelivery is still possible, retention reads this.
    .index("by_received", ["receivedAt"]),

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
    mode: deliveryMode,
    attempts: v.optional(v.number()),
    nextAttemptAt: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      // Resend accepted it, delivery is not confirmed until its webhook says so.
      v.literal("queued"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    error: v.optional(v.string()),
    // The Resend component's id for the mail, so its delivery event finds this row.
    emailId: v.optional(v.string()),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  })
    .index("by_rule_event", ["ruleId", "eventId"])
    .index("by_user_status", ["userId", "status"])
    // Digest eligibility is a seek, not a scan past everything queued for instant delivery.
    .index("by_user_status_mode", ["userId", "status", "mode"])
    .index("by_email", ["emailId"]),

  // One row per task a user ticked off. The key is stable per rotation, so a new sortie starts clean.
  completions: defineTable({
    userId: v.id("users"),
    key: v.string(),
    expiresAt: v.number(),
    doneAt: v.number(),
  })
    .index("by_user_key", ["userId", "key"])
    // Retention sweeps by expiry, so a finished rotation's rows leave without a scan.
    .index("by_expires", ["expiresAt"]),

  // round2-mastery block, added by the mastery slice. Keep it last.
  items: defineTable({
    uniqueName: v.string(),
    name: v.string(),
    category: v.string(),
    kind: masteryKind,
    masteryReq: v.number(),
    masteryXp: v.number(),
    buildable: v.boolean(),
    components: v.array(v.object({ itemType: v.string(), count: v.number() })),
    // builds: base stats, frames only, weapons carry no comparable set.
    stats: v.optional(
      v.object({
        health: v.number(),
        shield: v.number(),
        armor: v.number(),
        energy: v.number(),
        sprint: v.number(),
      }),
    ),
  })
    .index("by_unique_name", ["uniqueName"])
    .index("by_kind", ["kind"]),

  starNodes: defineTable({
    uniqueName: v.string(),
    name: v.string(),
    planet: v.string(),
    masteryReq: v.number(),
  }).index("by_unique_name", ["uniqueName"]),

  // One row per player id, refreshed at most every six hours, DE bans on abuse.
  profileCache: defineTable({
    playerId: v.string(),
    fetchedAt: v.number(),
    displayName: v.string(),
    masteryRank: v.number(),
    nodesCompleted: v.number(),
    xpByItem: v.array(v.object({ uniqueName: v.string(), xp: v.number() })),
  }).index("by_player", ["playerId"]),
  // end round2-mastery block

  // builds block. Mods and arcanes share a table, kind tells them apart.
  mods: defineTable({
    uniqueName: v.string(),
    name: v.string(),
    kind: v.union(v.literal("mod"), v.literal("arcane")),
    polarity,
    rarity: v.string(),
    // compatName where DE gives one, so "Whips" beats "MELEE" in the picker.
    type: v.string(),
    slot: modSlot,
    baseDrain: v.number(),
    fusionLimit: v.number(),
    description: v.string(),
    effects: v.array(v.object({ stat: statKey, percent: v.number() })),
  })
    .index("by_unique_name", ["uniqueName"])
    .index("by_slot", ["slot"]),

  builds: defineTable({
    userId: v.id("users"),
    // uniqueName of a warframe or a weapon, the same key the items table uses.
    itemId: v.string(),
    name: v.string(),
    slots: buildSlots,
    forma: v.number(),
    orokinReactor: v.boolean(),
    notes: v.string(),
    public: v.boolean(),
    source: v.literal("manual"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_public", ["public"]),
  // end builds block
});
