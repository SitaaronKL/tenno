import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { ConvexError, v } from "convex/values";
import { z } from "zod";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { requireUser } from "../lib/auth";
import { buildSlots } from "../schema";
import { emptySlots, MAX_ARCANES, MOD_SLOTS, type Polarity } from "../../lib/builds/capacity";
import { MODEL } from "./index";
import { checkLimit } from "./limits";

export const SYSTEM =
  "You build Warframe loadouts. Pick mods for the goal from the list you are given and nothing else, " +
  "answer with their exact names. Fill up to eight mod slots, an aura and an exilus when they help, and " +
  "up to two arcanes. Every mod goes in at max rank. Say in one or two plain sentences why these mods " +
  "serve the goal. No dashes in the notes, use commas.";

export const BuildDraft = z.object({
  name: z.string().describe("a short name for the build"),
  aura: z.string().nullable(),
  exilus: z.string().nullable(),
  mods: z.array(z.string()).max(MOD_SLOTS),
  arcanes: z.array(z.string()).max(MAX_ARCANES),
  notes: z.string(),
});

type Catalog = { uniqueName: string; name: string; slot: string; fusionLimit: number }[];

// The model answers with names, the editor needs unique names, so anything it invented drops here.
export function toSlots(draft: z.infer<typeof BuildDraft>, catalog: Catalog) {
  const byName = new Map(catalog.map((mod) => [mod.name.toLowerCase(), mod]));
  const ref = (name: string | null, wanted: string) => {
    const mod = name ? byName.get(name.trim().toLowerCase()) : undefined;
    if (!mod || mod.slot !== wanted) return null;
    return { uniqueName: mod.uniqueName, rank: mod.fusionLimit };
  };
  const slots = emptySlots();
  slots.aura = ref(draft.aura, "aura");
  slots.exilus = ref(draft.exilus, "exilus");
  const picked = draft.mods.map((name) => ref(name, "mod")).filter(Boolean).slice(0, MOD_SLOTS);
  picked.forEach((mod, i) => {
    slots.mods[i] = mod;
  });
  slots.arcanes = draft.arcanes
    .map((name) => ref(name, "arcane"))
    .filter((mod): mod is { uniqueName: string; rank: number } => mod !== null)
    .slice(0, MAX_ARCANES);
  return slots;
}

const draftShape = v.object({
  itemId: v.string(),
  itemName: v.string(),
  name: v.string(),
  slots: buildSlots,
  notes: v.string(),
});

export type BuildDraftResult = {
  itemId: string;
  itemName: string;
  name: string;
  slots: {
    aura: { uniqueName: string; rank: number } | null;
    exilus: { uniqueName: string; rank: number } | null;
    mods: ({ uniqueName: string; rank: number } | null)[];
    arcanes: { uniqueName: string; rank: number }[];
    shards: { color: string; count: number }[];
    polarities: { aura: Polarity | null; exilus: Polarity | null; mods: (Polarity | null)[] };
  };
  notes: string;
};

// One generation, no save. The caller opens it in the editor and decides.
export const draftForUser = internalAction({
  args: { userId: v.id("users"), item: v.string(), goal: v.string() },
  returns: draftShape,
  handler: async (ctx, { userId, item, goal }): Promise<BuildDraftResult> => {
    await checkLimit(
      ctx,
      "buildDrafts",
      userId,
      "That is too many build drafts this hour. Try again a little later.",
    );
    const catalog = await ctx.runQuery(internal.builds.catalogForGoal, { item });
    if (!catalog.item) throw new ConvexError(`I do not know an item called ${item}`);
    const list = catalog.mods
      .map((mod) => `${mod.name} [${mod.slot}] ${mod.description}`)
      .join("\n")
      .slice(0, 12000);
    const result = await generateObject({
      model: openai(MODEL),
      schema: BuildDraft,
      system: SYSTEM,
      prompt: `Item: ${catalog.item.name}\nGoal: ${goal}\n\nMods you may use:\n${list}`,
    });
    return {
      itemId: catalog.item.uniqueName,
      itemName: catalog.item.name,
      name: result.object.name,
      slots: toSlots(result.object, catalog.mods),
      notes: result.object.notes,
    };
  },
});

export const draft = action({
  args: { item: v.string(), goal: v.string() },
  returns: draftShape,
  handler: async (ctx, { item, goal }): Promise<BuildDraftResult> => {
    const { userId } = await requireUser(ctx);
    return await ctx.runAction(internal.agent.buildDrafter.draftForUser, {
      userId: userId as Id<"users">,
      item,
      goal,
    });
  },
});
