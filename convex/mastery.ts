import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { masteryKind } from "./schema";

const item = v.object({
  uniqueName: v.string(),
  name: v.string(),
  kind: masteryKind,
  masteryReq: v.number(),
  masteryXp: v.number(),
});

const profile = v.object({
  displayName: v.string(),
  masteryRank: v.number(),
  nodesCompleted: v.number(),
  fetchedAt: v.number(),
});

// The roster is the same for everybody and only changes on a game data import, so it is its own
// query. Joining it to a player here would re-read all of it every time a profile is synced.
export const items = query({
  args: {},
  returns: v.array(item),
  handler: async (ctx) => {
    await requireUser(ctx);
    const rows = await ctx.db.query("items").collect();
    return rows
      .map((row) => ({
        uniqueName: row.uniqueName,
        name: row.name,
        kind: row.kind,
        masteryReq: row.masteryReq,
        masteryXp: row.masteryXp,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Scoped to the caller. The player id comes from their own profile, never from an argument,
// so knowing somebody else's 24 characters buys nothing.
export const progress = query({
  args: {},
  returns: v.object({
    playerId: v.union(v.string(), v.null()),
    xpByItem: v.array(v.object({ uniqueName: v.string(), xp: v.number() })),
    profile: v.union(profile, v.null()),
  }),
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const own = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const playerId = own?.masteryPlayerId ?? null;
    const cache =
      playerId === null
        ? null
        : await ctx.db
            .query("profileCache")
            .withIndex("by_player", (q) => q.eq("playerId", playerId))
            .unique();
    return {
      playerId,
      xpByItem: cache?.xpByItem ?? [],
      profile: cache
        ? {
            displayName: cache.displayName,
            masteryRank: cache.masteryRank,
            nodesCompleted: cache.nodesCompleted,
            fetchedAt: cache.fetchedAt,
          }
        : null,
    };
  },
});
