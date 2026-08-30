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
    expect(ruleSentence({ kind: "cycle", world: "cetus", state: "night" })).toBe("Cetus turns night");
  });

  it("names what Baro has to bring", () => {
    expect(ruleSentence({ kind: "baro", items: ["Primed Chamber"] })).toBe("Baro brings Primed Chamber");
  });
});
