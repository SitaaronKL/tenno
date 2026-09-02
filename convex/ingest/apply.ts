import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { WorldState } from "../../lib/contracts/worldstate";
import { vPlatform } from "../lib/validators";
import { worldStateValidator } from "../schema";

type NewEvent = Pick<Doc<"worldEvents">, "kind" | "key" | "startsAt" | "expiresAt" | "payload">;

// Relic order, the way the star chart and every fissure tracker lists them.
const TIER_ORDER = ["Lith", "Meso", "Neo", "Axi", "Requiem", "Omnia"];

// Sorted here so worldstate.get can hand the stored snapshot back without touching it.
function sorted(state: WorldState): WorldState {
  return {
    ...state,
    fissures: [...state.fissures].sort(
      (a, b) =>
        TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.expiresAt - b.expiresAt,
    ),
  };
}

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
  // One notification per weekly rollover. The season expiry sits months out, the weekly acts
  // are what actually changes on a Monday, so the soonest weekly expiry is the key.
  if (state.nightwave) {
    const n = state.nightwave;
    const weekly = n.acts.filter((a) => !a.daily).map((a) => a.expiresAt);
    const rollover = weekly.length > 0 ? Math.min(...weekly) : n.expiresAt;
    push("nightwave", `season:${n.season}:week:${rollover}`, state.fetchedAt, rollover, n);
  }
  // A board is news once per rotation, so the expiry the whole board shares keys it.
  for (const b of state.bounties ?? []) {
    push("bounty", `${b.syndicate}:${b.expiresAt}`, state.fetchedAt, b.expiresAt, b);
  }
  // One row per weekly rotation, the variant plus the expiry is what changes on a Monday.
  for (const a of state.archimedea ?? []) {
    push("archimedea", a.key, state.fetchedAt, a.expiresAt, a);
  }
  // The arbitration rotates on the hour, so its own expiry is what keys the hour it belongs to.
  if (state.arbitration) {
    const a = state.arbitration;
    push("arbitration", `${a.node}:${a.expiresAt}`, a.expiresAt - 3_600_000, a.expiresAt, a);
  }
  // One event per phase. The start is rounded to the minute so every pull inside a phase agrees.
  for (const c of state.cycles) {
    const startsAt = Math.round((c.startsAt ?? c.expiresAt) / 60_000) * 60_000;
    push("cycle", `${c.world}:${c.state}:${startsAt}`, startsAt, c.expiresAt, c);
  }
  return out;
}

// The snapshot minus its clock fields: equal keys mean nothing a viewer sees has changed.
function contentKey(state: WorldState): string {
  const { fetchedAt: _f, upstreamTimestamp: _u, stale: _s, source: _src, ...content } = state;
  return JSON.stringify(content);
}

export const apply = internalMutation({
  args: { platform: vPlatform, state: worldStateValidator },
  returns: v.number(),
  handler: async (ctx, args) => {
    const state: WorldState = sorted(args.state);
    const existing = await ctx.db
      .query("worldState")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .unique();
    // Every write here pushes the full snapshot to every open dashboard, so a pull that
    // changed nothing but the clock must not touch the document.
    if (!existing) {
      await ctx.db.insert("worldState", {
        platform: args.platform,
        fetchedAt: state.fetchedAt,
        data: state,
      });
    } else if (contentKey(existing.data) !== contentKey(state)) {
      await ctx.db.patch(existing._id, { fetchedAt: state.fetchedAt, data: state });
    }

    // Freshness always updates, it lives in its own tiny row so it is cheap to push.
    const meta = {
      fetchedAt: state.fetchedAt,
      upstreamTimestamp: state.upstreamTimestamp,
      stale: state.stale,
      source: state.source,
    };
    const existingMeta = await ctx.db
      .query("worldMeta")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .unique();
    if (existingMeta) await ctx.db.patch(existingMeta._id, meta);
    else await ctx.db.insert("worldMeta", { platform: args.platform, ...meta });

    const eventIds: Id<"worldEvents">[] = [];
    for (const event of eventsOf(state)) {
      if (!event.key) continue;
      // Nobody wants to hear about something that is already over.
      if (event.expiresAt !== undefined && event.expiresAt <= state.fetchedAt) continue;
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

    // The first ingest after a deploy is the whole world at once. Record it, do not text about it.
    if (eventIds.length > 0 && existing) {
      await ctx.scheduler.runAfter(0, internal.rules.evaluate, { eventIds });
    }
    return eventIds.length;
  },
});
