import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { masteryKind } from "../schema";
import itemsData from "./items.json";
import nodesData from "./nodes.json";

const itemArg = v.object({
  uniqueName: v.string(),
  name: v.string(),
  category: v.string(),
  kind: masteryKind,
  masteryReq: v.number(),
  masteryXp: v.number(),
  buildable: v.boolean(),
  components: v.array(v.object({ itemType: v.string(), count: v.number() })),
});

type Item = typeof itemsData extends readonly (infer T)[] ? T : never;

// Upserts the trimmed Public Export. Run after scripts/import-public-export.mjs.
export const importGameData = internalMutation({
  args: { batch: v.optional(v.array(itemArg)) },
  returns: v.object({ items: v.number(), nodes: v.number() }),
  handler: async (ctx, { batch }) => {
    const items = (batch ?? (itemsData as Item[])) as Array<typeof itemArg.type>;
    for (const item of items) {
      const existing = await ctx.db
        .query("items")
        .withIndex("by_unique_name", (q) => q.eq("uniqueName", item.uniqueName))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, item);
      } else {
        await ctx.db.insert("items", item);
      }
    }
    for (const node of nodesData) {
      const existing = await ctx.db
        .query("starNodes")
        .withIndex("by_unique_name", (q) => q.eq("uniqueName", node.uniqueName))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, node);
      } else {
        await ctx.db.insert("starNodes", node);
      }
    }
    return { items: items.length, nodes: nodesData.length };
  },
});
