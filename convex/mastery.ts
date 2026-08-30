import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { masteryKind } from "./schema";

const row = v.object({
  uniqueName: v.string(),
  name: v.string(),
  kind: masteryKind,
  masteryReq: v.number(),
  masteryXp: v.number(),
  mastered: v.boolean(),
});

const profile = v.object({
  displayName: v.string(),
  masteryRank: v.number(),
  nodesCompleted: v.number(),
  fetchedAt: v.number(),
});

// One read for the whole page: every mastery giving item, flagged against a looked up profile.
export const progress = query({
  args: { playerId: v.union(v.string(), v.null()) },
  returns: v.object({
    rows: v.array(row),
    total: v.number(),
    mastered: v.number(),
    percent: v.number(),
    profile: v.union(profile, v.null()),
  }),
  handler: async (ctx, { playerId }) => {
    await requireUser(ctx);
    const items = await ctx.db.query("items").collect();
    const cache =
      playerId === null
        ? null
        : await ctx.db
            .query("profileCache")
            .withIndex("by_player", (q) => q.eq("playerId", playerId.trim().toLowerCase()))
            .unique();
    const xp = new Map((cache?.xpByItem ?? []).map((entry) => [entry.uniqueName, entry.xp]));
    const rows = items
      .map((item) => ({
        uniqueName: item.uniqueName,
        name: item.name,
        kind: item.kind,
        masteryReq: item.masteryReq,
        masteryXp: item.masteryXp,
        // Mastered means ranked to the cap, which is exactly the item's full mastery xp.
        mastered: (xp.get(item.uniqueName) ?? 0) >= item.masteryXp,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const mastered = rows.filter((r) => r.mastered).length;
    return {
      rows,
      total: rows.length,
      mastered,
      percent: rows.length === 0 ? 0 : Math.round((mastered / rows.length) * 100),
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
