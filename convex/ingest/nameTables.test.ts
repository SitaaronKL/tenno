import { describe, expect, it } from "vitest";
import { NAME_TABLES } from "./nameTables";
import { ARBITRATIONS, ARBY_TIERS, INCURSIONS } from "./scheduleData";
import { deNamePaths } from "./de";

// The loaders cast the shipped JSON once so tsc never infers a literal type for it. These pin the
// first row of each table, so a cast that quietly reshapes the data fails here rather than in ingest.
describe("name tables", () => {
  it("reads the first star chart node with its enemy and mission type", () => {
    expect(NAME_TABLES.nodes.SolNode94).toEqual({
      value: "Apollodorus (Mercury)",
      enemy: "Infested",
      type: "Survival",
    });
  });

  it("keeps the bare id modifiers in the bundle and the /Lotus paths out of it", () => {
    expect(NAME_TABLES.modifiers.abilitylockout).toMatchObject({ value: "Powerless" });
    const keys = Object.keys(NAME_TABLES.modifiers);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.some((key) => key.startsWith("/"))).toBe(false);
  });

  it("still names mission types, factions and syndicates", () => {
    expect(Object.keys(NAME_TABLES.missionTypes).length).toBeGreaterThan(0);
    expect(Object.keys(NAME_TABLES.factions).length).toBeGreaterThan(0);
    expect(Object.keys(NAME_TABLES.syndicates).length).toBeGreaterThan(0);
  });
});

describe("schedule tables", () => {
  // scripts/refresh-schedules.mjs re-cuts both windows, so these ask for the shape the loader
  // promises rather than for the node that happened to be first the day they were written.
  it("reads the first incursion day as six node ids", () => {
    expect(INCURSIONS.days[0]).toHaveLength(6);
    for (const node of INCURSIONS.days[0]) expect(node).toMatch(/^SolNode\d+$/);
    expect(typeof INCURSIONS.from).toBe("number");
  });

  it("reads the first arbitration hour as one node id, and the tiers as one letter each", () => {
    // Arbitrations run on Clan and Sol nodes both, the id shape is what the loader promises.
    expect(ARBITRATIONS.hours[0]).toMatch(/^\w+Node\d+$/);
    expect(ARBY_TIERS.SolNode450).toBe("S");
    for (const tier of Object.values(ARBY_TIERS)) expect(tier).toMatch(/^[SA-F]$/);
  });

  // The generator caps the window, an oversized file is what used to slow the deploy down.
  it("holds at most sixty days of arbitrations", () => {
    expect(ARBITRATIONS.hours.length).toBeLessThanOrEqual(60 * 24);
  });
});

describe("deNamePaths", () => {
  it("finds every /Lotus path a snapshot names, lowercased and deduped", () => {
    const paths = deNamePaths({
      Alerts: [{ ItemType: "/Lotus/Types/Items/MiscItems/OrokinCell" }],
      Goals: [{ Desc: "/Lotus/Language/Menu/DogDays", Node: "SolNode1" }],
      Repeat: "/lotus/types/items/miscitems/orokincell",
    });
    expect(paths.sort()).toEqual([
      "/lotus/language/menu/dogdays",
      "/lotus/types/items/miscitems/orokincell",
    ]);
  });
});
