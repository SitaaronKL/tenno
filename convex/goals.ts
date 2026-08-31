import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { explodeRecipe, type Part } from "./lib/resources";

// Every part a built item asks for, by uniqueName. A table, not a bundled file: it is 260 KB and
// every deploy paid for it. Seeded by scripts/seed-tables.mjs, see scripts/build-components.mjs.
async function partsByUniqueName(ctx: QueryCtx): Promise<Map<string, Part>> {
  const rows = await ctx.db.query("parts").collect();
  return new Map(
    rows.map((row) => [
      row.uniqueName,
      { uniqueName: row.uniqueName, name: row.name, components: row.components },
    ]),
  );
}

const source = v.object({ place: v.string(), rotation: v.string(), chance: v.number() });

const goal = v.object({
  _id: v.id("goals"),
  itemName: v.string(),
  wantedCount: v.number(),
  haveCount: v.number(),
  fromBuildId: v.optional(v.string()),
  createdAt: v.number(),
  // Where it drops, best chance first, so a row shows a farm without a second query.
  sources: v.array(source),
});

async function ownGoal(ctx: MutationCtx, id: Id<"goals">): Promise<Doc<"goals">> {
  const { userId } = await requireUser(ctx);
  const row = await ctx.db.get(id);
  // The same answer either way, so a stranger's probe cannot tell a missing goal from someone else's.
  if (!row || row.userId !== userId) throw new ConvexError("No such goal");
  return row;
}

async function mergeGoal(
  ctx: MutationCtx,
  userId: Id<"users">,
  itemName: string,
  wantedCount: number,
  fromBuildId?: string,
): Promise<Id<"goals">> {
  const existing = await ctx.db
    .query("goals")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const same = existing.find((row) => row.itemName === itemName);
  if (same) {
    await ctx.db.patch(same._id, { wantedCount: same.wantedCount + wantedCount });
    return same._id;
  }
  return await ctx.db.insert("goals", {
    userId,
    itemName,
    wantedCount,
    haveCount: 0,
    ...(fromBuildId ? { fromBuildId } : {}),
    createdAt: Date.now(),
  });
}

async function sourcesFor(ctx: QueryCtx, itemName: string) {
  const row = await ctx.db
    .query("dropSources")
    .withIndex("by_item_name", (q) => q.eq("itemName", itemName))
    .unique();
  return [...(row?.sources ?? [])].sort((a, b) => b.chance - a.chance);
}

export const list = query({
  args: {},
  returns: v.array(goal),
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const rows = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return await Promise.all(
      rows
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(async (row) => ({
          _id: row._id,
          itemName: row.itemName,
          wantedCount: row.wantedCount,
          haveCount: row.haveCount,
          ...(row.fromBuildId ? { fromBuildId: row.fromBuildId } : {}),
          createdAt: row.createdAt,
          sources: await sourcesFor(ctx, row.itemName),
        })),
    );
  },
});

// Every name a goal can be made from: what gives mastery, plus every part and resource a recipe
// names. One query, cached, so the search box filters in the browser instead of per keystroke.
export const itemNames = query({
  args: {},
  returns: v.array(v.object({ name: v.string(), uniqueName: v.string(), buildable: v.boolean() })),
  handler: async (ctx) => {
    await requireUser(ctx);
    const items = await ctx.db.query("items").collect();
    const names = new Map<string, { name: string; uniqueName: string; buildable: boolean }>();
    for (const part of (await partsByUniqueName(ctx)).values()) {
      names.set(part.name, { name: part.name, uniqueName: part.uniqueName, buildable: false });
    }
    for (const item of items) {
      names.set(item.name, {
        name: item.name,
        uniqueName: item.uniqueName,
        buildable: item.buildable,
      });
    }
    return [...names.values()].sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const add = mutation({
  args: { itemName: v.string(), wantedCount: v.number() },
  returns: v.id("goals"),
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const itemName = args.itemName.trim();
    if (itemName === "") throw new ConvexError("Name that item first");
    const wanted = Math.max(1, Math.round(args.wantedCount));
    return await mergeGoal(ctx, userId, itemName, wanted);
  },
});

export const setHave = mutation({
  args: { id: v.id("goals"), haveCount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ownGoal(ctx, args.id);
    await ctx.db.patch(row._id, { haveCount: Math.max(0, Math.round(args.haveCount)) });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("goals") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ownGoal(ctx, args.id);
    await ctx.db.delete(row._id);
    return null;
  },
});

// One click from an item to everything it takes to build it, counts merged into what is already
// tracked. A part is a goal of its own, and so is what that part is built from.
export const addFromItem = mutation({
  args: { uniqueName: v.string(), fromBuildId: v.optional(v.string()) },
  returns: v.object({ added: v.number() }),
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const item = await ctx.db
      .query("items")
      .withIndex("by_unique_name", (q) => q.eq("uniqueName", args.uniqueName))
      .unique();
    if (!item) throw new ConvexError("We have no recipe for that item");

    const lines = explodeRecipe(item.components, await partsByUniqueName(ctx));
    for (const line of lines) {
      await mergeGoal(ctx, userId, line.itemName, line.count, args.fromBuildId);
    }
    return { added: lines.length };
  },
});
