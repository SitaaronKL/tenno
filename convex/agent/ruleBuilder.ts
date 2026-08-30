import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { requireUser } from "../lib/auth";
import { RuleInput } from "../../lib/contracts/rule";
import { MODEL } from "./index";

export const SYSTEM =
  "Turn the user's sentence into one Warframe notification rule. Pick the kind that matches, leave a filter " +
  "field null when the user did not ask for it, default mode to instant and channels to email. Give the rule a " +
  "short name.";

// The draft is never saved, so a bad model answer must fail here, not downstream.
export function toRuleInput(raw: unknown) {
  return RuleInput.parse(raw);
}

export function buildPrompt(text: string, world: unknown) {
  const context = world ? JSON.stringify(world).slice(0, 4000) : "none";
  return `Current world state (for names like mission types and bosses):\n${context}\n\nUser: ${text}`;
}

export const draft = action({
  args: { text: v.string() },
  returns: v.any(),
  handler: async (ctx, { text }) => {
    await requireUser(ctx);
    const world = await ctx.runQuery(api.worldstate.get, { platform: "pc" });
    const result = await generateObject({
      model: openai(MODEL),
      schema: RuleInput,
      system: SYSTEM,
      prompt: buildPrompt(text, world),
    });
    return toRuleInput(result.object);
  },
});
