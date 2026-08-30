import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Warframe's clock: the daily rolls at 00:00 UTC, the weekly rolls with it on a Monday.
const DAY_MS = 24 * 60 * 60_000;

// The cron runs every hour, only the midnight run has anything to say.
export const tick = internalMutation({
  args: { at: v.optional(v.number()) },
  returns: v.number(),
  handler: async (ctx, { at }) => {
    const now = new Date(at ?? Date.now());
    if (now.getUTCHours() !== 0) return 0;

    const date = now.toISOString().slice(0, 10);
    const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const periods: ("daily" | "weekly")[] = now.getUTCDay() === 1 ? ["daily", "weekly"] : ["daily"];

    const eventIds: Id<"worldEvents">[] = [];
    for (const period of periods) {
      // The date is in the key, so a retry inside the same hour cannot fire it twice.
      const key = `${period}:${date}`;
      const seen = await ctx.db
        .query("worldEvents")
        .withIndex("by_platform_kind_key", (q) =>
          q.eq("platform", "pc").eq("kind", "reset").eq("key", key),
        )
        .first();
      if (seen) continue;
      eventIds.push(
        await ctx.db.insert("worldEvents", {
          platform: "pc",
          kind: "reset",
          key,
          startsAt: midnight,
          expiresAt: midnight + (period === "weekly" ? 7 * DAY_MS : DAY_MS),
          seenAt: midnight,
          payload: { period, date },
        }),
      );
    }
    if (eventIds.length > 0) await ctx.scheduler.runAfter(0, internal.rules.evaluate, { eventIds });
    return eventIds.length;
  },
});
