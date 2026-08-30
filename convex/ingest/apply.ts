import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { internalMutation } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { WorldState } from "../../lib/contracts/worldstate";

// Slice 4 owns convex/rules.ts, reference it by name so this compiles before it lands.
const evaluate = makeFunctionReference<"mutation", { eventIds: Id<"worldEvents">[] }>(
  "rules:evaluate",
);

type NewEvent = Pick<Doc<"worldEvents">, "kind" | "key" | "startsAt" | "expiresAt" | "payload">;

// One row per upstream entity a rule can match on, kinds match EVENT_KINDS in lib/contracts/rule.ts.
function eventsOf(state: WorldState): NewEvent[] {
  const out: NewEvent[] = [];
  const push = (kind: string, key: string, startsAt: number, expiresAt: number, payload: unknown) =>
    out.push({ kind, key, startsAt, expiresAt, payload });

  for (const f of state.fissures) push("fissure", f.key, f.startsAt, f.expiresAt, f);
  for (const a of state.alerts) push("alert", a.key, a.startsAt, a.expiresAt, a);
  // Invasions have no upstream expiry, they end when completion hits 100.
  for (const i of state.invasions) push("invasion", i.key, i.startsAt, 0, i);
  if (state.sortie) push("sortie", state.sortie.key, state.sortie.startsAt, state.sortie.expiresAt, state.sortie);
  if (state.archonHunt) {
    const a = state.archonHunt;
    push("archonHunt", a.key, a.startsAt, a.expiresAt, a);
  }
  if (state.baro) push("baro", state.baro.key, state.baro.startsAt, state.baro.expiresAt, state.baro);
  for (const act of state.nightwave?.acts ?? []) {
    push("nightwave", act.key, state.fetchedAt, act.expiresAt, act);
  }
  for (const c of state.cycles) {
    push("cycle", `${c.world}:${c.state}:${c.expiresAt}`, state.fetchedAt, c.expiresAt, c);
  }
  return out;
}

export const apply = internalMutation({
  args: { platform: v.string(), state: v.any() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const state = args.state as WorldState;
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

    if (eventIds.length > 0) await ctx.scheduler.runAfter(0, evaluate, { eventIds });
    return eventIds.length;
  },
});
