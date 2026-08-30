import { v } from "convex/values";
import { query } from "./_generated/server";
import { vPlatform } from "./lib/validators";
import { worldStateValidator } from "./schema";

// Public and unauthenticated: world state is the same for everyone.
// Recorded as a deliberate exception in contract-errata.md.
// No clock here on purpose: a query is cached on its arguments and its reads, so a Date.now()
// filter freezes at whatever the first caller saw. Ingest sorts, ingest.prune drops what expired,
// and the panels hide the rest against their own clock.
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
