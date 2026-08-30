import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Both tables are append only. Without this they grow for the life of the deployment.
const EVENT_DAYS = 7;
const INBOUND_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

// One bounded page per run, so a long neglected deployment cannot blow the transaction limit.
const PAGE = 200;

export const sweep = internalMutation({
  args: { now: v.optional(v.number()) },
  returns: v.object({ events: v.number(), inbound: v.number(), completions: v.number() }),
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();

    const events = await ctx.db
      .query("worldEvents")
      .withIndex("by_seen", (q) => q.lt("seenAt", now - EVENT_DAYS * DAY))
      .take(PAGE);
    for (const event of events) await ctx.db.delete(event._id);

    const inbound = await ctx.db
      .query("photonInbound")
      .withIndex("by_received", (q) => q.lt("receivedAt", now - INBOUND_DAYS * DAY))
      .take(PAGE);
    for (const row of inbound) await ctx.db.delete(row._id);

    // A check off only means something while its rotation runs, past that it is dead weight.
    const completions = await ctx.db
      .query("completions")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .take(PAGE);
    for (const row of completions) await ctx.db.delete(row._id);

    return { events: events.length, inbound: inbound.length, completions: completions.length };
  },
});
