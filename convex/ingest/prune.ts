import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import type { WorldState } from "../../lib/contracts/worldstate";
import { vPlatform } from "../lib/validators";

// worldstate.get has no clock, so something has to drop expired entities from the stored snapshot.
// The ingest cron runs this straight after apply.
export const prune = internalMutation({
  args: { platform: vPlatform, now: v.optional(v.number()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("worldState")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .unique();
    if (!row) return 0;

    const now = args.now ?? Date.now();
    const data = row.data as WorldState;
    const fissures = data.fissures.filter((f) => f.expiresAt > now);
    const alerts = data.alerts.filter((a) => a.expiresAt > now);
    const dropped = data.fissures.length - fissures.length + (data.alerts.length - alerts.length);
    if (dropped === 0) return 0;

    await ctx.db.patch(row._id, { data: { ...data, fissures, alerts } });
    return dropped;
  },
});
