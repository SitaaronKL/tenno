import { describe, expect, it } from "vitest";
import { TABLES, shape, toJsonl } from "./seed-tables.mjs";

// Five rows of each shape, inline, so the suite never reads a 500 KB file or hits the network.
const SAMPLES = {
  dropSources: {
    items: {
      "Orokin Cell": [{ place: "Corrupted Vor", rotation: "", chance: 50 }],
      Rubedo: [{ place: "Ceres, Bode", rotation: "", chance: 25 }],
      Neurodes: [{ place: "Lua, Pavlov", rotation: "B", chance: 10 }],
      Plastids: [{ place: "Saturn, Piscinas", rotation: "", chance: 12.5 }],
      Nanospores: [{ place: "Eris, Naeglar", rotation: "", chance: 40 }],
    },
  },
  deNames: {
    paths: {
      "/lotus/types/items/miscitems/orokincell": "Orokin Cell",
      "/lotus/types/items/miscitems/rubedo": { value: "Rubedo" },
      "/lotus/language/menu/dogdays": { value: "Dog Days", desc: "Tactical Alert" },
      "/lotus/types/items/miscitems/neurode": { value: "Neurodes", desc: "" },
      "/lotus/weapons/tenno/melee/swords/skana": "Skana",
    },
  },
};

function five(table) {
  return shape(table, SAMPLES[table]);
}

describe("seed-tables shaping", () => {
  it("names a file and a build script for every table it seeds", () => {
    for (const [table, spec] of Object.entries(TABLES)) {
      expect(spec.file, table).toMatch(/^convex\/gamedata\/.+\.json$/);
      expect(spec.build, table).toMatch(/^node scripts\//);
    }
  });

  it("turns the drop table mirror into one row per item", () => {
    const rows = five("dropSources");
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({
      itemName: "Orokin Cell",
      sources: [{ place: "Corrupted Vor", rotation: "", chance: 50 }],
    });
  });

  it("turns the name paths into rows keyed by the path ingest looks up", () => {
    const rows = five("deNames");
    expect(rows[0]).toEqual({ path: "/lotus/types/items/miscitems/orokincell", value: "Orokin Cell" });
    // Convex takes no undefined, so a missing or blank desc is left off the row entirely.
    expect(rows[1]).toEqual({ path: "/lotus/types/items/miscitems/rubedo", value: "Rubedo" });
    expect(rows[2].desc).toBe("Tactical Alert");
    expect(rows[3]).not.toHaveProperty("desc");
  });

  it("writes one JSON object a line, and a trailing newline", () => {
    const jsonl = toJsonl(five("dropSources"));
    const lines = jsonl.split("\n");
    expect(jsonl.endsWith("\n")).toBe(true);
    expect(lines.pop()).toBe("");
    expect(lines).toHaveLength(5);
    for (const line of lines) expect(typeof JSON.parse(line)).toBe("object");
  });

  it("refuses a row that is not an object, or that carries an undefined", () => {
    expect(() => toJsonl([])).toThrow(/no rows/);
    expect(() => toJsonl(["Rubedo"])).toThrow(/not an object/);
    expect(() => toJsonl([{ itemName: undefined }])).toThrow(/undefined/);
  });

  it("names the table it cannot seed rather than importing nothing", () => {
    expect(() => shape("nosuch", {})).toThrow(/no such table/);
  });
});
