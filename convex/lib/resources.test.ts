import { describe, expect, test } from "vitest";
import type { WorldState } from "../../lib/contracts/worldstate";
import { explodeRecipe, farmRule, liveDrops, topSources } from "./resources";

const EMPTY: WorldState = {
  platform: "pc",
  fetchedAt: 0,
  upstreamTimestamp: 0,
  stale: false,
  fissures: [],
  alerts: [],
  invasions: [],
  sortie: null,
  archonHunt: null,
  baro: null,
  nightwave: null,
  cycles: [],
};

const SOURCES = [
  { place: "Level 40 - 60 Orb Vallis Bounty", rotation: "A", chance: 33.33 },
  { place: "Corrupted Vor", rotation: "", chance: 50 },
  { place: "Formido (Caches) (Deimos), Caches", rotation: "C", chance: 19.36 },
  { place: "Marduk (Void), Survival", rotation: "B", chance: 5 },
];

describe("drop source lookup", () => {
  test("the top places come back best chance first", () => {
    expect(topSources(SOURCES, 3).map((source) => source.place)).toEqual([
      "Corrupted Vor",
      "Level 40 - 60 Orb Vallis Bounty",
      "Formido (Caches) (Deimos), Caches",
    ]);
  });

  test("an item nothing drops has no places", () => {
    expect(topSources([], 3)).toEqual([]);
  });
});

describe("live now", () => {
  test("an invasion offering the item lights the badge", () => {
    const state: WorldState = {
      ...EMPTY,
      invasions: [
        {
          key: "i1",
          node: "Tessera (Venus)",
          description: "Grineer offensive",
          attacker: { faction: "Grineer", reward: null },
          defender: { faction: "Corpus", reward: { item: "Orokin Cell", count: 3, credits: 0 } },
          completion: 40,
          startsAt: 0,
        },
      ],
    };
    expect(liveDrops(state, "Orokin Cell", [])).toEqual([
      { kind: "invasion", label: "Invasion, Tessera (Venus)" },
    ]);
  });

  test("nothing live means no badge", () => {
    expect(liveDrops(EMPTY, "Orokin Cell", SOURCES)).toEqual([]);
  });

  test("a fissure counts when the item comes out of that tier's relics", () => {
    const state: WorldState = {
      ...EMPTY,
      fissures: [
        {
          key: "f1",
          node: "Ani (Void)",
          missionType: "Survival",
          enemy: "Corrupted",
          tier: "Axi",
          steelPath: false,
          storm: false,
          startsAt: 0,
          expiresAt: 0,
        },
      ],
    };
    const relic = [{ place: "Axi M3 relic", rotation: "", chance: 2 }];
    expect(liveDrops(state, "Mesa Prime Neuroptics", relic)).toEqual([
      { kind: "fissure", label: "Axi fissure, Ani (Void)" },
    ]);
  });

  test("an alert reward counts", () => {
    const state: WorldState = {
      ...EMPTY,
      alerts: [
        {
          key: "a1",
          node: "Selkie (Sedna)",
          missionType: "Survival",
          enemy: "Grineer",
          rewards: [{ item: "Nitain Extract", count: 1, credits: 0 }],
          startsAt: 0,
          expiresAt: 0,
        },
      ],
    };
    expect(liveDrops(state, "Nitain Extract", [])[0].kind).toBe("alert");
  });

  test("a bounty job listing the item counts", () => {
    const state: WorldState = {
      ...EMPTY,
      bounties: [
        {
          syndicate: "Ostrons",
          node: "Cetus (Earth)",
          expiresAt: 0,
          jobs: [
            { level: "5 - 15", minLevel: 5, maxLevel: 15, standing: 1000, rewards: ["Nitain Extract"] },
          ],
        },
      ],
    };
    expect(liveDrops(state, "Nitain Extract", [])[0]).toEqual({
      kind: "bounty",
      label: "Ostrons bounty, Cetus (Earth)",
    });
  });
});

describe("farm this", () => {
  test("a live invasion prefills an invasion rule for the item", () => {
    const rule = farmRule("Orokin Cell", [{ kind: "invasion", label: "Invasion, Tessera (Venus)" }]);
    expect(rule?.filter).toEqual({ kind: "invasion", rewards: ["Orokin Cell"] });
    expect(rule?.name).toBe("Orokin Cell from an invasion");
  });

  test("a live bounty prefills a bounty rule", () => {
    const rule = farmRule("Nitain Extract", [{ kind: "bounty", label: "Ostrons bounty, Cetus (Earth)" }]);
    expect(rule?.filter).toEqual({
      kind: "bounty",
      syndicates: ["Ostrons"],
      level: null,
      missionTypes: null,
    });
  });

  test("a fissure has no reward filter, so there is no rule to prefill", () => {
    expect(farmRule("Mesa Prime Neuroptics", [{ kind: "fissure", label: "Axi fissure" }])).toBeNull();
  });
});

describe("recipe explosion", () => {
  const parts = new Map([
    [
      "/Recipes/Neuroptics",
      {
        uniqueName: "/Recipes/Neuroptics",
        name: "Ash Neuroptics",
        components: [
          { itemType: "/Items/Rubedo", count: 500 },
          { itemType: "/Items/NeuralSensor", count: 1 },
        ],
      },
    ],
    [
      "/Recipes/Chassis",
      {
        uniqueName: "/Recipes/Chassis",
        name: "Ash Chassis",
        components: [{ itemType: "/Items/Rubedo", count: 150 }],
      },
    ],
    [
      "/Recipes/Systems",
      { uniqueName: "/Recipes/Systems", name: "Ash Systems", components: [] },
    ],
    ["/Items/Rubedo", { uniqueName: "/Items/Rubedo", name: "Rubedo", components: [] }],
    ["/Items/NeuralSensor", { uniqueName: "/Items/NeuralSensor", name: "Neural Sensor", components: [] }],
    ["/Items/OrokinCell", { uniqueName: "/Items/OrokinCell", name: "Orokin Cell", components: [] }],
  ]);

  const frame = [
    { itemType: "/Recipes/Neuroptics", count: 1 },
    { itemType: "/Recipes/Chassis", count: 1 },
    { itemType: "/Recipes/Systems", count: 1 },
    { itemType: "/Items/OrokinCell", count: 2 },
  ];

  test("a frame with three parts explodes into the parts and what they are built from", () => {
    expect(explodeRecipe(frame, parts)).toEqual([
      { itemName: "Ash Neuroptics", count: 1 },
      { itemName: "Rubedo", count: 650 },
      { itemName: "Neural Sensor", count: 1 },
      { itemName: "Ash Chassis", count: 1 },
      { itemName: "Ash Systems", count: 1 },
      { itemName: "Orokin Cell", count: 2 },
    ]);
  });

  test("a part asked for twice multiplies what it is built from", () => {
    const twice = [{ itemType: "/Recipes/Chassis", count: 3 }];
    expect(explodeRecipe(twice, parts)).toEqual([
      { itemName: "Ash Chassis", count: 3 },
      { itemName: "Rubedo", count: 450 },
    ]);
  });

  test("a component we cannot name is left out rather than shown as a path", () => {
    expect(explodeRecipe([{ itemType: "/Items/Unknown", count: 1 }], parts)).toEqual([]);
  });
});
