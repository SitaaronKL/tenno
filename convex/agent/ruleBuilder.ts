import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { requireUser } from "../lib/auth";
import { RuleInput, type RuleInput as RuleInputType } from "../../lib/contracts/rule";
import { vRuleInput } from "../lib/validators";
import { MODEL } from "./index";
import { checkLimit } from "./limits";

export const SYSTEM =
  "Turn the user's sentence into one Warframe notification rule. Pick the kind that matches, leave a filter " +
  "field null when the user did not ask for it, default mode to instant and channels to email. Give the rule a " +
  "short name. The kinds are fissure, invasion, alert, baro, sortie, archonHunt, cycle, nightwave, bounty, " +
  "archimedea, arbitration and reset. A cycle rule takes leadMinutes when the user wants warning before the state begins, " +
  "a bounty rule takes syndicates, the board level 1 to 7 where the last row is the hardest, and mission types, an archimedea rule takes the " +
  "variant deep or temporal plus deviations and risks, an arbitration rule takes mission types and node " +
  "tiers S to F, and a reset rule is daily or weekly.";

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
  returns: vRuleInput,
  handler: async (ctx, { text }): Promise<RuleInputType> => {
    const { userId } = await requireUser(ctx);
    await checkLimit(
      ctx,
      "ruleDrafts",
      userId,
      "That is too many rule drafts this hour. Try again a little later.",
    );
    const world: unknown = await ctx.runQuery(api.worldstate.get, { platform: "pc" });
    const result = await generateObject({
      model: openai(MODEL),
      schema: RuleInput,
      system: SYSTEM,
      prompt: buildPrompt(text, world),
    });
    return toRuleInput(result.object);
  },
});
