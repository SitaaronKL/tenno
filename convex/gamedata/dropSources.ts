import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

const source = v.object({ place: v.string(), rotation: v.string(), chance: v.number() });

const row = v.object({ itemName: v.string(), sources: v.array(source) });

// Upserts drop sources handed in by the caller. The full seed is
// `node scripts/seed-tables.mjs dropSources`, this is the partial refresh after a drop table
// change: the 320 KB file used to be imported here and every deploy bundled it.
export const importDropSources = internalMutation({
  args: { batch: v.array(row) },
  returns: v.object({ items: v.number() }),
  handler: async (ctx, { batch }) => {
    const rows = batch;
    for (const item of rows) {
      const existing = await ctx.db
        .query("dropSources")
        .withIndex("by_item_name", (q) => q.eq("itemName", item.itemName))
        .unique();
      if (existing) await ctx.db.patch(existing._id, item);
      else await ctx.db.insert("dropSources", item);
    }
    return { items: rows.length };
  },
});
