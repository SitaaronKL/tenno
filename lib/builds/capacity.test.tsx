import { describe, expect, it } from "vitest";
import {
  emptySlots,
  modDrain,
  previewStats,
  slotCost,
  summarize,
  type ModDef,
} from "./capacity";

// Real rows from DE's Public Export, so the numbers below are the game's numbers.
const MODS: Record<string, ModDef> = {
  vitality: {
    uniqueName: "vitality",
    name: "Vitality",
    kind: "mod",
    polarity: "vazarin",
    slot: "mod",
    baseDrain: 2,
    fusionLimit: 10,
    effects: [{ stat: "health", percent: 100 }],
  },
  serration: {
    uniqueName: "serration",
    name: "Serration",
    kind: "mod",
    polarity: "madurai",
    slot: "mod",
    baseDrain: 4,
    fusionLimit: 10,
    effects: [],
  },
  streamline: {
    uniqueName: "streamline",
    name: "Streamline",
    kind: "mod",
    polarity: "naramon",
    slot: "mod",
    baseDrain: 4,
    fusionLimit: 5,
    effects: [{ stat: "efficiency", percent: 30 }],
  },
  intensify: {
    uniqueName: "intensify",
    name: "Intensify",
    kind: "mod",
    polarity: "madurai",
    slot: "mod",
    baseDrain: 6,
    fusionLimit: 5,
    effects: [{ stat: "strength", percent: 30 }],
  },
  rush: {
    uniqueName: "rush",
    name: "Rush",
    kind: "mod",
    polarity: "naramon",
    slot: "exilus",
    baseDrain: 6,
    fusionLimit: 5,
    effects: [{ stat: "sprint", percent: 30 }],
  },
  corrosiveProjection: {
    uniqueName: "corrosiveProjection",
    name: "Corrosive Projection",
    kind: "mod",
    polarity: "naramon",
    slot: "aura",
    baseDrain: -2,
    fusionLimit: 5,
    effects: [],
  },
};

const catalog = new Map(Object.values(MODS).map((mod) => [mod.uniqueName, mod]));

describe("mod drain", () => {
  it("adds one capacity a rank, so a maxed Serration costs 14", () => {
    expect(modDrain(MODS.serration, 10)).toBe(14);
    expect(modDrain(MODS.serration, 0)).toBe(4);
  });

  it("counts an aura the other way, a maxed Corrosive Projection gives 7 back", () => {
    expect(modDrain(MODS.corrosiveProjection, 5)).toBe(-7);
  });
});

describe("polarity math", () => {
  it("halves a matching polarity, 14 becomes 7", () => {
    expect(slotCost(MODS.serration, 10, "madurai")).toBe(7);
    expect(slotCost(MODS.vitality, 10, "vazarin")).toBe(6);
  });

  it("rounds a halved odd drain up the way the game does, 9 becomes 5", () => {
    expect(slotCost(MODS.streamline, 5, null)).toBe(9);
    expect(slotCost(MODS.streamline, 5, "naramon")).toBe(5);
  });

  it("adds a quarter for a mismatched polarity, rounded up", () => {
    expect(slotCost(MODS.serration, 10, "vazarin")).toBe(18);
    expect(slotCost(MODS.streamline, 5, "madurai")).toBe(12);
  });

  it("doubles what an aura gives back when the slot matches", () => {
    expect(slotCost(MODS.corrosiveProjection, 5, null)).toBe(-7);
    expect(slotCost(MODS.corrosiveProjection, 5, "naramon")).toBe(-14);
  });
});

describe("capacity", () => {
  it("starts at 30, or 60 with a reactor", () => {
    const bare = summarize({ slots: emptySlots(), orokinReactor: false }, catalog);
    expect(bare.total).toBe(30);
    expect(bare.used).toBe(0);
    expect(bare.remaining).toBe(30);
    expect(bare.over).toBe(false);
  });

  it("adds the aura's drain on top, doubled on a matching slot", () => {
    const slots = emptySlots();
    slots.aura = { uniqueName: "corrosiveProjection", rank: 5 };
    slots.polarities.aura = "naramon";
    const summary = summarize({ slots, orokinReactor: true }, catalog);
    expect(summary.total).toBe(74);
  });

  it("goes over when the mods cost more than the frame has", () => {
    const slots = emptySlots();
    slots.mods[0] = { uniqueName: "serration", rank: 10 };
    slots.mods[1] = { uniqueName: "vitality", rank: 10 };
    slots.mods[2] = { uniqueName: "intensify", rank: 5 };
    const summary = summarize({ slots, orokinReactor: false }, catalog);
    expect(summary.used).toBe(37);
    expect(summary.remaining).toBe(-7);
    expect(summary.over).toBe(true);
  });

  it("counts the exilus slot with the rest", () => {
    const slots = emptySlots();
    slots.exilus = { uniqueName: "rush", rank: 5 };
    expect(summarize({ slots, orokinReactor: false }, catalog).used).toBe(11);
  });
});

describe("stat preview", () => {
  const rhino = { health: 270, shield: 455, armor: 240, energy: 100, sprint: 0.95 };

  it("leaves an unmodded frame at its base stats", () => {
    const stats = previewStats(rhino, emptySlots(), catalog);
    expect(stats.health).toBe(270);
    expect(stats.strength).toBe(100);
    expect(stats.efficiency).toBe(100);
  });

  it("doubles health with a maxed Vitality", () => {
    const slots = emptySlots();
    slots.mods[0] = { uniqueName: "vitality", rank: 10 };
    expect(previewStats(rhino, slots, catalog).health).toBe(540);
  });

  it("scales a lower rank the way the game does, rank 0 Vitality is 9 percent", () => {
    const slots = emptySlots();
    slots.mods[0] = { uniqueName: "vitality", rank: 0 };
    expect(previewStats(rhino, slots, catalog).health).toBe(295);
  });

  it("adds ability mods to the 100 percent every frame starts with", () => {
    const slots = emptySlots();
    slots.mods[0] = { uniqueName: "intensify", rank: 5 };
    slots.exilus = { uniqueName: "rush", rank: 5 };
    const stats = previewStats(rhino, slots, catalog);
    expect(stats.strength).toBe(130);
    expect(stats.sprint).toBe(1.24);
  });
});
