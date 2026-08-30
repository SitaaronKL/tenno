import { ConvexError, v } from "convex/values";
import { internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { buildSlots, masteryKind } from "./schema";
import { MOD_SLOTS } from "../lib/builds/capacity";

const baseStats = v.object({
  health: v.number(),
  shield: v.number(),
  armor: v.number(),
  energy: v.number(),
  sprint: v.number(),
});

const itemShape = v.object({
  uniqueName: v.string(),
  name: v.string(),
  kind: masteryKind,
  stats: v.optional(baseStats),
});

const buildShape = v.object({
  _id: v.id("builds"),
  itemId: v.string(),
  itemName: v.string(),
  name: v.string(),
  slots: buildSlots,
  forma: v.number(),
  orokinReactor: v.boolean(),
  notes: v.string(),
  public: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
  mine: v.boolean(),
});

// A slot list of the wrong length would silently drop mods, so it is checked before it is stored.
function checkSlots(slots: typeof buildSlots.type) {
  if (slots.mods.length !== MOD_SLOTS || slots.polarities.mods.length !== MOD_SLOTS) {
    throw new ConvexError(`A build has exactly ${MOD_SLOTS} mod slots`);
  }
  if (slots.arcanes.length > 2) throw new ConvexError("A build takes at most two arcanes");
}

async function itemName(ctx: QueryCtx, itemId: string) {
  const item = await ctx.db
    .query("items")
    .withIndex("by_unique_name", (index) => index.eq("uniqueName", itemId))
    .unique();
  return item?.name ?? itemId;
}

// Only a frame or a weapon can be built on, so the picker never offers a resource.
export const items = query({
  args: {},
  returns: v.array(itemShape),
  handler: async (ctx) => {
    await requireUser(ctx);
    const rows = await ctx.db.query("items").collect();
    return rows
      .filter((row) => row.kind !== "other")
      .map((row) => ({
        uniqueName: row.uniqueName,
        name: row.name,
        kind: row.kind,
        ...(row.stats ? { stats: row.stats } : {}),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const list = query({
  args: {},
  returns: v.array(buildShape),
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const rows = await ctx.db
      .query("builds")
      .withIndex("by_user", (index) => index.eq("userId", userId))
      .collect();
    const out = [];
    for (const row of rows) out.push(await shape(ctx, row, userId));
    return out.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

async function shape(ctx: QueryCtx, row: Doc<"builds">, userId: Id<"users">) {
  return {
    _id: row._id,
    itemId: row.itemId,
    itemName: await itemName(ctx, row.itemId),
    name: row.name,
    slots: row.slots,
    forma: row.forma,
    orokinReactor: row.orokinReactor,
    notes: row.notes,
    public: row.public,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    mine: row.userId === userId,
  };
}

// A private build is the owner's alone, a public one is readable by anyone holding the id.
export const get = query({
  args: { id: v.id("builds") },
  returns: v.union(buildShape, v.null()),
  handler: async (ctx, { id }) => {
    const { userId } = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row) return null;
    if (row.userId !== userId && !row.public) throw new ConvexError("That build is private");
    return await shape(ctx, row, userId);
  },
});

export const create = mutation({
  args: {
    itemId: v.string(),
    name: v.string(),
    slots: buildSlots,
    forma: v.optional(v.number()),
    orokinReactor: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    public: v.optional(v.boolean()),
  },
  returns: v.id("builds"),
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    checkSlots(args.slots);
    const now = Date.now();
    return await ctx.db.insert("builds", {
      userId,
      itemId: args.itemId,
      name: args.name.trim() || "Untitled build",
      slots: args.slots,
      forma: args.forma ?? 0,
      orokinReactor: args.orokinReactor ?? false,
      notes: args.notes ?? "",
      public: args.public ?? false,
      source: "manual" as const,
      createdAt: now,
      updatedAt: now,
    });
  },
});

async function own(ctx: MutationCtx, id: Id<"builds">, userId: Id<"users">) {
  const row = await ctx.db.get(id);
  if (!row || row.userId !== userId) throw new ConvexError("That build is not yours");
  return row;
}

export const update = mutation({
  args: {
    id: v.id("builds"),
    itemId: v.optional(v.string()),
    name: v.optional(v.string()),
    slots: v.optional(buildSlots),
    forma: v.optional(v.number()),
    orokinReactor: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    public: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, { id, ...patch }) => {
    const { userId } = await requireUser(ctx);
    await own(ctx, id, userId);
    if (patch.slots) checkSlots(patch.slots);
    const fields = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("builds") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const { userId } = await requireUser(ctx);
    await own(ctx, id, userId);
    await ctx.db.delete(id);
    return null;
  },
});

// A fork is a copy under the reader's name, private until they say otherwise.
export const fork = mutation({
  args: { id: v.id("builds") },
  returns: v.id("builds"),
  handler: async (ctx, { id }) => {
    const { userId } = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row) throw new ConvexError("That build is gone");
    if (row.userId !== userId && !row.public) throw new ConvexError("That build is private");
    const now = Date.now();
    return await ctx.db.insert("builds", {
      userId,
      itemId: row.itemId,
      name: `${row.name} (fork)`,
      slots: row.slots,
      forma: row.forma,
      orokinReactor: row.orokinReactor,
      notes: row.notes,
      public: false,
      source: "manual" as const,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// The agent drafts against the same catalog the editor uses, without a session of its own.
export const catalogForGoal = internalQuery({
  args: { item: v.string() },
  returns: v.object({
    item: v.union(itemShape, v.null()),
    mods: v.array(
      v.object({
        uniqueName: v.string(),
        name: v.string(),
        slot: v.string(),
        type: v.string(),
        baseDrain: v.number(),
        fusionLimit: v.number(),
        description: v.string(),
      }),
    ),
  }),
  handler: async (ctx, { item }) => {
    const needle = item.trim().toLowerCase();
    const items = await ctx.db.query("items").collect();
    const found =
      items.find((row) => row.name.toLowerCase() === needle) ??
      items.find((row) => row.name.toLowerCase().includes(needle)) ??
      null;
    const kind = found?.kind ?? "warframe";
    // Weapon mods are typed by weapon family, frames all share the one WARFRAME type.
    const wanted = kind === "warframe" ? ["WARFRAME", "AURA"] : null;
    const mods = await ctx.db.query("mods").collect();
    return {
      item: found
        ? {
            uniqueName: found.uniqueName,
            name: found.name,
            kind: found.kind,
            ...(found.stats ? { stats: found.stats } : {}),
          }
        : null,
      mods: mods
        .filter((mod) => (wanted ? wanted.includes(mod.type) : mod.kind === "mod"))
        .slice(0, 300)
        .map((mod) => ({
          uniqueName: mod.uniqueName,
          name: mod.name,
          slot: mod.slot,
          type: mod.type,
          baseDrain: mod.baseDrain,
          fusionLimit: mod.fusionLimit,
          description: mod.description,
        })),
    };
  },
});
