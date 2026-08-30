import { Agent, type AgentComponent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { stepCountIs } from "ai";
import { components } from "../_generated/api";
import { createRule, getWorldState, listRules, searchItems } from "./tools";

export const MODEL = "gpt-5.6-luna";

// Codegen without a deployment types components loosely, so pin the shape here.
export const agentComponent = components.agent as unknown as AgentComponent;

export const tenno = new Agent(agentComponent, {
  name: "tenno",
  languageModel: openai(MODEL),
  instructions:
    "You are Voidwatch, a Warframe assistant with live world state. Be brief. Use tools instead of guessing: " +
    "getWorldState for anything happening right now, searchItems for wiki facts, listRules and createRule for " +
    "the user's notification rules. Confirm a rule with the user before you create it. Times are unix ms, say " +
    "how long is left in plain words.",
  tools: { getWorldState, listRules, createRule, searchItems },
  stopWhen: stepCountIs(5),
});
