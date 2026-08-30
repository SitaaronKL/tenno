import { v } from "convex/values";

// Convex mirror of lib/contracts/rule.ts. Change one, change both.

export const vPlatform = v.literal("pc");
export const vChannel = v.union(v.literal("email"), v.literal("imessage"));
export const vDeliveryMode = v.union(v.literal("instant"), v.literal("digest"));

// Which upstream answered, warframestat or DE's own feed.
export const vSource = v.union(v.literal("warframestat"), v.literal("de"));

export const vFissureTier = v.union(
  v.literal("Lith"),
  v.literal("Meso"),
  v.literal("Neo"),
  v.literal("Axi"),
  v.literal("Requiem"),
  v.literal("Omnia"),
);

export const vCycleWorld = v.union(
  v.literal("cetus"),
  v.literal("vallis"),
  v.literal("cambion"),
  v.literal("earth"),
  v.literal("duviri"),
  v.literal("zariman"),
);

export const vRuleFilter = v.union(
  v.object({
    kind: v.literal("fissure"),
    tiers: v.union(v.array(vFissureTier), v.null()),
    missionTypes: v.union(v.array(v.string()), v.null()),
    steelPath: v.union(v.boolean(), v.null()),
    storm: v.union(v.boolean(), v.null()),
  }),
  v.object({ kind: v.literal("invasion"), rewards: v.union(v.array(v.string()), v.null()) }),
  v.object({ kind: v.literal("alert"), rewards: v.union(v.array(v.string()), v.null()) }),
  v.object({ kind: v.literal("baro"), items: v.union(v.array(v.string()), v.null()) }),
  v.object({
    kind: v.literal("sortie"),
    boss: v.union(v.array(v.string()), v.null()),
    missionTypes: v.union(v.array(v.string()), v.null()),
  }),
  v.object({ kind: v.literal("archonHunt"), boss: v.union(v.array(v.string()), v.null()) }),
  v.object({ kind: v.literal("cycle"), world: vCycleWorld, state: v.string() }),
  v.object({ kind: v.literal("nightwave") }),
);

// What rules.create takes and what the AI rule builder drafts.
export const vRuleInput = v.object({
  name: v.string(),
  filter: vRuleFilter,
  mode: vDeliveryMode,
  channels: v.array(vChannel),
});
