import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { modSlot, polarity, statKey } from "../schema";

const modArg = v.object({
  uniqueName: v.string(),
  name: v.string(),
  kind: v.union(v.literal("mod"), v.literal("arcane")),
  polarity,
  rarity: v.string(),
  type: v.string(),
  slot: modSlot,
  baseDrain: v.number(),
  fusionLimit: v.number(),
  description: v.string(),
  effects: v.array(v.object({ stat: statKey, percent: v.number() })),
});

// Upserts mods and arcanes handed in by the caller. The full seed is
// `node scripts/seed-tables.mjs mods`, this is the partial refresh after a game update: the
// 540 KB file used to be imported here and every deploy bundled it.
export const importMods = internalMutation({
  args: {
    batch: v.array(modArg),
    from: v.optional(v.number()),
    count: v.optional(v.number()),
  },
  returns: v.object({ imported: v.number(), next: v.union(v.number(), v.null()) }),
  handler: async (ctx, { batch, from = 0, count = 500 }) => {
    const all = batch;
    const page = all.slice(from, from + count);
    for (const mod of page) {
      const existing = await ctx.db
        .query("mods")
        .withIndex("by_unique_name", (q) => q.eq("uniqueName", mod.uniqueName))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, mod);
      } else {
        await ctx.db.insert("mods", mod);
      }
    }
    const next = from + page.length;
    return { imported: page.length, next: next < all.length ? next : null };
  },
});
