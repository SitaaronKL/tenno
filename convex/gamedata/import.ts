import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { masteryKind } from "../schema";

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

const nodeArg = v.object({
  uniqueName: v.string(),
  name: v.string(),
  planet: v.string(),
  masteryReq: v.number(),
});

// Upserts items and star chart nodes handed in by the caller. The full seed is
// `node scripts/seed-tables.mjs items starNodes`, this is the partial refresh after a game update:
// items.json and nodes.json used to be imported here and every deploy bundled them.
export const importGameData = internalMutation({
  args: { items: v.array(itemArg), nodes: v.optional(v.array(nodeArg)) },
  returns: v.object({ items: v.number(), nodes: v.number() }),
  handler: async (ctx, { items, nodes = [] }) => {
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
    for (const node of nodes) {
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
    return { items: items.length, nodes: nodes.length };
  },
});
