import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { modSlot, polarity, statKey } from "./schema";

const modShape = v.object({
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

function strip(row: Doc<"mods">) {
  const { _id, _creationTime, ...rest } = row;
  void _id;
  void _creationTime;
  return rest;
}

// The picker searches, so the filtering happens here. Shipping all 1700 rows to every editor
// would be most of a megabyte for a list nobody reads whole.
export const search = query({
  args: {
    q: v.optional(v.string()),
    slot: v.optional(modSlot),
    polarity: v.optional(polarity),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(modShape),
  handler: async (ctx, { q, slot, polarity: pol, type, limit = 60 }) => {
    await requireUser(ctx);
    const rows = slot
      ? await ctx.db
          .query("mods")
          .withIndex("by_slot", (index) => index.eq("slot", slot))
          .collect()
      : await ctx.db.query("mods").collect();
    const needle = (q ?? "").trim().toLowerCase();
    return rows
      .filter((row) => {
        if (needle && !row.name.toLowerCase().includes(needle)) return false;
        if (pol && row.polarity !== pol) return false;
        if (type && row.type !== type) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit)
      .map(strip);
  },
});

// The editor needs the full definition of whatever is already installed, search may not return it.
export const byNames = query({
  args: { uniqueNames: v.array(v.string()) },
  returns: v.array(modShape),
  handler: async (ctx, { uniqueNames }) => {
    await requireUser(ctx);
    const found = [];
    for (const uniqueName of [...new Set(uniqueNames)]) {
      const row = await ctx.db
        .query("mods")
        .withIndex("by_unique_name", (index) => index.eq("uniqueName", uniqueName))
        .unique();
      if (row) found.push(strip(row));
    }
    return found;
  },
});

// Every mod type in the table, so the picker's type filter is not a hard coded list.
export const types = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    await requireUser(ctx);
    const rows = await ctx.db.query("mods").collect();
    return [...new Set(rows.map((row) => row.type))].sort((a, b) => a.localeCompare(b));
  },
});
