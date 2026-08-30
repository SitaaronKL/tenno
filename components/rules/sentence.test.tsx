import { describe, expect, it } from "vitest";
import { ruleSentence } from "./sentence";

describe("rule sentence", () => {
  it("reads a fissure filter as one line", () => {
    expect(
      ruleSentence({
        kind: "fissure",
        tiers: ["Axi"],
        missionTypes: ["Survival", "Defense"],
        steelPath: true,
        storm: null,
      }),
    ).toBe("Axi fissure, Survival or Defense, Steel Path only");
  });

  it("says any when nothing is constrained", () => {
    expect(
      ruleSentence({ kind: "fissure", tiers: null, missionTypes: null, steelPath: null, storm: null }),
    ).toBe("Any fissure");
  });

  it("keeps the excluded side of Steel Path visible", () => {
    expect(
      ruleSentence({ kind: "fissure", tiers: null, missionTypes: null, steelPath: false, storm: null }),
    ).toBe("Any fissure, no Steel Path");
  });

  it("names the world and the state for a cycle", () => {
    expect(ruleSentence({ kind: "cycle", world: "cetus", state: "night", leadMinutes: null })).toBe(
      "Cetus turns night",
    );
  });

  it("puts the warning ahead of the phase when a cycle has lead minutes", () => {
    expect(ruleSentence({ kind: "cycle", world: "cetus", state: "night", leadMinutes: 10 })).toBe(
      "10 minutes before Cetus turns night",
    );
    expect(ruleSentence({ kind: "cycle", world: "vallis", state: "warm", leadMinutes: 1 })).toBe(
      "1 minute before Orb Vallis turns warm",
    );
  });

  it("reads a bounty by its board position", () => {
    expect(
      ruleSentence({
        kind: "bounty",
        syndicates: ["The Holdfasts", "The Hex"],
        level: 5,
        missionTypes: ["Exterminate"],
      }),
    ).toBe("Tier 5 bounty from The Holdfasts or The Hex, Exterminate");
    expect(ruleSentence({ kind: "bounty", syndicates: null, level: null, missionTypes: null })).toBe(
      "Any bounty",
    );
  });

  it("names both resets", () => {
    expect(ruleSentence({ kind: "reset", period: "daily" })).toBe("Daily reset");
    expect(ruleSentence({ kind: "reset", period: "weekly" })).toBe("Weekly reset");
  });

  it("names the sortie modifier the user asked for", () => {
    expect(
      ruleSentence({ kind: "sortie", boss: null, missionTypes: null, modifiers: ["Melee Only"] }),
    ).toBe("Any sortie, Melee Only");
  });

  it("names what Baro has to bring", () => {
    expect(ruleSentence({ kind: "baro", items: ["Primed Chamber"] })).toBe("Baro brings Primed Chamber");
  });
});
