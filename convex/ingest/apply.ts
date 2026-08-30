import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { WorldState } from "../../lib/contracts/worldstate";
import { vPlatform } from "../lib/validators";
import { worldStateValidator } from "../schema";

type NewEvent = Pick<Doc<"worldEvents">, "kind" | "key" | "startsAt" | "expiresAt" | "payload">;

// One row per upstream entity a rule can match on, kinds match EVENT_KINDS in lib/contracts/rule.ts.
function eventsOf(state: WorldState): NewEvent[] {
  const out: NewEvent[] = [];
  const push = (kind: string, key: string, startsAt: number, expiresAt: number | undefined, payload: unknown) =>
    out.push({ kind, key, startsAt, expiresAt, payload });

  for (const f of state.fissures) push("fissure", f.key, f.startsAt, f.expiresAt, f);
  for (const a of state.alerts) push("alert", a.key, a.startsAt, a.expiresAt, a);
  // Invasions have no upstream expiry, they end when completion hits 100.
  for (const i of state.invasions) push("invasion", i.key, i.startsAt, undefined, i);
  if (state.sortie) push("sortie", state.sortie.key, state.sortie.startsAt, state.sortie.expiresAt, state.sortie);
  if (state.archonHunt) {
    const a = state.archonHunt;
    push("archonHunt", a.key, a.startsAt, a.expiresAt, a);
  }
  // Baro is in every response, the arrival is the news, not the next visit on the calendar.
  if (state.baro?.active) {
    push("baro", state.baro.key, state.baro.startsAt, state.baro.expiresAt, state.baro);
  }
  // One notification per weekly rollover, upstream lists ten acts at once.
  if (state.nightwave) {
    const n = state.nightwave;
    push("nightwave", `season:${n.season}:${n.expiresAt}`, state.fetchedAt, n.expiresAt, n);
  }
  // One event per phase. The start is rounded to the minute so every pull inside a phase agrees.
  for (const c of state.cycles) {
    const startsAt = Math.round((c.startsAt ?? c.expiresAt) / 60_000) * 60_000;
    push("cycle", `${c.world}:${c.state}:${startsAt}`, startsAt, c.expiresAt, c);
  }
  return out;
}

export const apply = internalMutation({
  args: { platform: vPlatform, state: worldStateValidator },
  returns: v.number(),
  handler: async (ctx, args) => {
    const state: WorldState = args.state;
    const existing = await ctx.db
      .query("worldState")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { fetchedAt: state.fetchedAt, data: state });
    } else {
      await ctx.db.insert("worldState", {
        platform: args.platform,
        fetchedAt: state.fetchedAt,
        data: state,
      });
    }

    const eventIds: Id<"worldEvents">[] = [];
    for (const event of eventsOf(state)) {
      if (!event.key) continue;
      const seen = await ctx.db
        .query("worldEvents")
        .withIndex("by_platform_kind_key", (q) =>
          q.eq("platform", args.platform).eq("kind", event.kind).eq("key", event.key),
        )
        .first();
      if (seen) continue;
      eventIds.push(
        await ctx.db.insert("worldEvents", {
          platform: args.platform,
          seenAt: state.fetchedAt,
          ...event,
        }),
      );
    }

    if (eventIds.length > 0) await ctx.scheduler.runAfter(0, internal.rules.evaluate, { eventIds });
    return eventIds.length;
  },
});
