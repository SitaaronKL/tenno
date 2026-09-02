import { v } from "convex/values";
import { query } from "./_generated/server";
import { vPlatform, vSource } from "./lib/validators";
import { worldStateValidator } from "./schema";

// Public and unauthenticated: world state is the same for everyone.
// Recorded as a deliberate exception in contract-errata.md.
// No clock here on purpose: a query is cached on its arguments and its reads, so a Date.now()
// filter freezes at whatever the first caller saw. Ingest sorts, ingest.prune drops what expired,
// and the panels hide the rest against their own clock.
// Freshness for the staleness banner. Tiny on purpose: it updates every pull, the snapshot does not.
export const meta = query({
  args: { platform: vPlatform },
  returns: v.union(
    v.object({
      fetchedAt: v.number(),
      upstreamTimestamp: v.number(),
      stale: v.boolean(),
      source: v.optional(vSource),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("worldMeta")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .unique();
    if (!row) return null;
    return {
      fetchedAt: row.fetchedAt,
      upstreamTimestamp: row.upstreamTimestamp,
      stale: row.stale,
      source: row.source,
    };
  },
});

export const get = query({
  args: { platform: vPlatform },
  returns: v.union(worldStateValidator, v.null()),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("worldState")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .unique();
    return row ? row.data : null;
  },
});
