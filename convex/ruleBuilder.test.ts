import { describe, expect, test } from "vitest";
import { generateObject } from "ai";
import { mockModel } from "@convex-dev/agent";
import { RuleInput } from "../lib/contracts/rule";
import { buildPrompt, toRuleInput } from "./agent/ruleBuilder";

function modelReturning(object: unknown) {
  return mockModel({ content: [{ type: "text", text: JSON.stringify(object) }] });
}

const axiRule = {
  name: "Axi survival",
  filter: {
    kind: "fissure",
    tiers: ["Axi"],
    missionTypes: ["Survival"],
    steelPath: null,
    storm: null,
  },
  mode: "instant",
  channels: ["email"],
};

describe("rule builder", () => {
  test("a sentence becomes a rule the app can save", async () => {
    const result = await generateObject({
      model: modelReturning(axiRule),
      schema: RuleInput,
      prompt: buildPrompt("tell me about Axi survival fissures", null),
    });
    const rule = toRuleInput(result.object);
    expect(rule.name).toBe("Axi survival");
    expect(rule.filter.kind).toBe("fissure");
    expect(rule.mode).toBe("instant");
    expect(rule.channels).toEqual(["email"]);
  });

  test("a draft that is not a real rule is rejected", () => {
    expect(() => toRuleInput({ ...axiRule, filter: { kind: "sandwich" } })).toThrow();
    expect(() => toRuleInput({ ...axiRule, channels: [] })).toThrow();
  });

  test("the prompt carries the world state so the model can name missions", () => {
    const prompt = buildPrompt("axi fissures", { fissures: [{ missionType: "Survival" }] });
    expect(prompt).toContain("Survival");
    expect(prompt).toContain("axi fissures");
  });
});
