import { v } from "convex/values";
import { query } from "./_generated/server";
import { vPlatform } from "./lib/validators";
import { worldStateValidator } from "./schema";
import type { Fissure, WorldState } from "../lib/contracts/worldstate";

// Relic order, the way the star chart and every fissure tracker lists them.
const TIER_ORDER: Fissure["tier"][] = ["Lith", "Meso", "Neo", "Axi", "Requiem", "Omnia"];

// Public and unauthenticated: world state is the same for everyone, the landing page reads it too.
// Recorded as a deliberate exception in contract-errata.md.
export const get = query({
  args: { platform: vPlatform },
  returns: v.union(worldStateValidator, v.null()),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("worldState")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .unique();
    if (!row) return null;
    // Ingest keeps everything upstream sent, so expiry is applied here, at the read.
    const now = Date.now();
    const data = row.data as WorldState;
    return {
      ...data,
      fissures: data.fissures
        .filter((f) => f.expiresAt > now)
        .sort(
          (a, b) =>
            TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.expiresAt - b.expiresAt,
        ),
      alerts: data.alerts.filter((a) => a.expiresAt > now),
      // Snapshots stored before bounties existed carry none, a panel should still get a list.
      bounties: data.bounties ?? [],
    };
  },
});
