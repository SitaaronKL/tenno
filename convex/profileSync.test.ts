import { describe, expect, it } from "vitest";
import { parseProfile } from "./profileSync";
import fixture from "./gamedata/profile-fixture.json";

describe("parseProfile", () => {
  it("reads the rank, the nodes run and the mastery ledger from a saved profile", () => {
    const parsed = parseProfile(fixture);

    expect(parsed.displayName).toBe("TennoTester");
    expect(parsed.masteryRank).toBe(27);
    expect(parsed.nodesCompleted).toBe(2);

    const xp = new Map(parsed.xpByItem.map((entry) => [entry.uniqueName, entry.xp]));
    expect(xp.get("/Lotus/Powersuits/Excalibur/Excalibur")).toBe(6000);
    // The same weapon appears twice, the higher affinity is the one that counts.
    expect(xp.get("/Lotus/Weapons/Tenno/Rifle/Rifle")).toBe(3000);
    expect(xp.get("/Lotus/Weapons/Tenno/Pistol/Lato")).toBe(1200);
  });

  it("refuses a body with no Results, which is what DE returns for a bad id", () => {
    expect(() => parseProfile({})).toThrow();
  });
});
