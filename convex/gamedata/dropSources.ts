import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import dropSourcesData from "./dropSources.json";

const source = v.object({ place: v.string(), rotation: v.string(), chance: v.number() });

const row = v.object({ itemName: v.string(), sources: v.array(source) });

type Row = typeof row.type;

const FILE = dropSourcesData as { items: Record<string, Row["sources"]> };

// Upserts the trimmed drop table mirror. Run after scripts/build-drop-sources.mjs.
// The file is about 320 KB, so one call seeds it all, batch is there for a partial reseed.
export const importDropSources = internalMutation({
  args: { batch: v.optional(v.array(row)) },
  returns: v.object({ items: v.number() }),
  handler: async (ctx, { batch }) => {
    const rows: Row[] =
      batch ?? Object.entries(FILE.items).map(([itemName, sources]) => ({ itemName, sources }));
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
