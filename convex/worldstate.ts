import { v } from "convex/values";
import { query } from "./_generated/server";
import { vPlatform } from "./lib/validators";
import { worldStateValidator } from "./schema";
import type { WorldState } from "../lib/contracts/worldstate";

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
      fissures: data.fissures.filter((f) => f.expiresAt > now),
      alerts: data.alerts.filter((a) => a.expiresAt > now),
    };
  },
});
