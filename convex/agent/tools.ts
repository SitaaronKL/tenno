import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { RuleInput } from "../../lib/contracts/rule";
import type { WorldState } from "../../lib/contracts/worldstate";
import type { SearchResult } from "../wiki";

// Every execute is annotated, otherwise the tools and the generated api infer through each other.

export const getWorldState = createTool({
  description: "Get the current Warframe world state: fissures, alerts, invasions, sorties, cycles, Baro.",
  inputSchema: z.object({}),
  execute: async (ctx): Promise<WorldState | null> => {
    return (await ctx.runQuery(api.worldstate.get, { platform: "pc" })) as WorldState | null;
  },
});

// The thread carries the user, so the same tools work in the web chat and over iMessage.
function owner(ctx: { userId?: string }): Id<"users"> {
  if (!ctx.userId) throw new Error("This chat is not linked to an account");
  return ctx.userId as Id<"users">;
}

export const listRules = createTool({
  description: "List the notification rules the user already has.",
  inputSchema: z.object({}),
  execute: async (ctx): Promise<Doc<"rules">[]> => {
    return (await ctx.runQuery(internal.rules.listForUser, { userId: owner(ctx) })) as Doc<"rules">[];
  },
});

export const createRule = createTool({
  description:
    "Create a notification rule for the user. Confirm the details with the user before calling this.",
  inputSchema: RuleInput,
  execute: async (ctx, input): Promise<{ id: Id<"rules">; name: string }> => {
    const id: Id<"rules"> = await ctx.runMutation(internal.rules.createForUser, {
      userId: owner(ctx),
      input,
    });
    return { id, name: input.name };
  },
});

export const searchItems = createTool({
  description: "Search the Warframe wiki for an item, mission, or mechanic, and read the top article.",
  inputSchema: z.object({ q: z.string().describe("search text, for example Primed Chamber") }),
  execute: async (ctx, { q }): Promise<SearchResult> => {
    return await ctx.runAction(api.wiki.searchItems, { q });
  },
});
