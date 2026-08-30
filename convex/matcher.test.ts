import { describe, expect, test } from "vitest";
import { matches } from "./matcher";
import type { RuleFilter } from "../lib/contracts/rule";

const cases: { name: string; filter: RuleFilter; event: { kind: string; payload: unknown }; want: boolean }[] = [
  {
    name: "archimedea deviation the player hates, either variant",
    filter: { kind: "archimedea", variant: null, deviations: ["Glyph Inflation"], risks: null },
    event: {
      kind: "archimedea",
      payload: {
        variant: "deep",
        missions: [{ missionType: "Defense", deviation: "Glyph Inflation", risks: ["Fortified Foes"] }],
      },
    },
    want: true,
  },
  {
    name: "archimedea of the wrong variant",
    filter: { kind: "archimedea", variant: "temporal", deviations: null, risks: null },
    event: { kind: "archimedea", payload: { variant: "deep", missions: [] } },
    want: false,
  },
  {
    name: "archimedea deviation that is not in this week's set",
    filter: { kind: "archimedea", variant: null, deviations: ["Mitosis"], risks: null },
    event: {
      kind: "archimedea",
      payload: {
        variant: "deep",
        missions: [{ missionType: "Defense", deviation: "Glyph Inflation", risks: [] }],
      },
    },
    want: false,
  },
  {
    name: "archimedea risk that only elite adds still counts",
    filter: { kind: "archimedea", variant: null, deviations: null, risks: ["Entanglement"] },
    event: {
      kind: "archimedea",
      payload: {
        variant: "deep",
        missions: [{ missionType: "Survival", deviation: "Parasitic Towers", risks: ["Devil's Bargain"] }],
        eliteBonus: ["Entanglement"],
      },
    },
    want: true,
  },
  {
    name: "fissure tier and mission type match",
    filter: { kind: "fissure", tiers: ["Axi"], missionTypes: ["Survival"], steelPath: null, storm: null },
    event: { kind: "fissure", payload: { tier: "Axi", missionType: "Survival", steelPath: false, storm: false } },
    want: true,
  },
  {
    name: "fissure wrong tier",
    filter: { kind: "fissure", tiers: ["Axi"], missionTypes: null, steelPath: null, storm: null },
    event: { kind: "fissure", payload: { tier: "Meso", missionType: "Survival" } },
    want: false,
  },
  {
    name: "fissure of the right tier but the wrong mission type",
    filter: { kind: "fissure", tiers: ["Axi"], missionTypes: ["Survival"], steelPath: null, storm: null },
    event: { kind: "fissure", payload: { tier: "Axi", missionType: "Capture", steelPath: false, storm: false } },
    want: false,
  },
  {
    name: "fissure rule that excludes Steel Path rejects a Steel Path fissure",
    filter: { kind: "fissure", tiers: null, missionTypes: null, steelPath: false, storm: null },
    event: { kind: "fissure", payload: { tier: "Axi", missionType: "Survival", steelPath: true } },
    want: false,
  },
  {
    name: "fissure rule that does not care takes a Steel Path fissure",
    filter: { kind: "fissure", tiers: null, missionTypes: null, steelPath: null, storm: null },
    event: { kind: "fissure", payload: { tier: "Axi", missionType: "Survival", steelPath: true } },
    want: true,
  },
  {
    name: "fissure steel path required but event is normal",
    filter: { kind: "fissure", tiers: null, missionTypes: null, steelPath: true, storm: null },
    event: { kind: "fissure", payload: { tier: "Axi", missionType: "Defense", steelPath: false } },
    want: false,
  },
  {
    name: "fissure storm wanted",
    filter: { kind: "fissure", tiers: null, missionTypes: null, steelPath: null, storm: true },
    event: { kind: "fissure", payload: { tier: "Neo", missionType: "Defense", storm: true } },
    want: true,
  },
  {
    name: "invasion reward matches case insensitively on either side",
    filter: { kind: "invasion", rewards: ["orokin catalyst"] },
    event: {
      kind: "invasion",
      payload: { attacker: { reward: { item: "Detonite Injector" } }, defender: { reward: { item: "Orokin Catalyst Blueprint" } } },
    },
    want: true,
  },
  {
    name: "invasion reward absent",
    filter: { kind: "invasion", rewards: ["Forma"] },
    event: { kind: "invasion", payload: { attacker: { reward: null }, defender: { reward: { item: "Mutagen Mass" } } } },
    want: false,
  },
  {
    name: "alert reward matches",
    filter: { kind: "alert", rewards: ["Nitain"] },
    event: { kind: "alert", payload: { rewards: [{ item: "Nitain Extract", count: 1 }] } },
    want: true,
  },
  {
    name: "alert with no reward filter matches any alert",
    filter: { kind: "alert", rewards: null },
    event: { kind: "alert", payload: { rewards: [{ item: "Credits" }] } },
    want: true,
  },
  {
    name: "baro item in inventory",
    filter: { kind: "baro", items: ["primed chamber"] },
    event: { kind: "baro", payload: { inventory: [{ item: "Primed Chamber", ducats: 500 }] } },
    want: true,
  },
  {
    name: "baro arrival with no item filter",
    filter: { kind: "baro", items: null },
    event: { kind: "baro", payload: { inventory: [] } },
    want: true,
  },
  {
    name: "baro item missing",
    filter: { kind: "baro", items: ["Primed Chamber"] },
    event: { kind: "baro", payload: { inventory: [{ item: "Primed Flow" }] } },
    want: false,
  },
  {
    name: "sortie boss and mission type",
    filter: { kind: "sortie", boss: ["Tyl Regor"], missionTypes: ["Rescue"], modifiers: null },
    event: { kind: "sortie", payload: { boss: "Tyl Regor", missions: [{ missionType: "Rescue" }, { missionType: "Survival" }] } },
    want: true,
  },
  {
    name: "sortie boss right but mission type absent",
    filter: { kind: "sortie", boss: ["Tyl Regor"], missionTypes: ["Spy"], modifiers: null },
    event: { kind: "sortie", payload: { boss: "Tyl Regor", missions: [{ missionType: "Rescue" }] } },
    want: false,
  },
  {
    name: "archon hunt boss",
    filter: { kind: "archonHunt", boss: ["Archon Nira"] },
    event: { kind: "archonHunt", payload: { boss: "Archon Nira", missions: [{ missionType: "Assassination" }] } },
    want: true,
  },
  {
    name: "archon hunt other boss",
    filter: { kind: "archonHunt", boss: ["Archon Amar"] },
    event: { kind: "archonHunt", payload: { boss: "Archon Boreal" } },
    want: false,
  },
  {
    name: "cycle world and state",
    filter: { kind: "cycle", world: "cetus", state: "night", leadMinutes: null },
    event: { kind: "cycle", payload: { world: "cetus", state: "night" } },
    want: true,
  },
  {
    name: "cycle right world wrong state",
    filter: { kind: "cycle", world: "cetus", state: "night", leadMinutes: null },
    event: { kind: "cycle", payload: { world: "cetus", state: "day" } },
    want: false,
  },
  {
    name: "cycle other world",
    filter: { kind: "cycle", world: "vallis", state: "warm", leadMinutes: null },
    event: { kind: "cycle", payload: { world: "cambion", state: "warm" } },
    want: false,
  },
  {
    name: "nightwave always matches a new act",
    filter: { kind: "nightwave" },
    event: { kind: "nightwave", payload: { title: "Friendly Fire" } },
    want: true,
  },
  {
    name: "kind mismatch never matches",
    filter: { kind: "nightwave" },
    event: { kind: "fissure", payload: {} },
    want: false,
  },
  {
    name: "bounty level 5 mission type matches the fifth job on the board",
    filter: { kind: "bounty", syndicates: ["The Holdfasts"], level: 5, missionTypes: ["Exterminate"] },
    event: {
      kind: "bounty",
      payload: {
        syndicate: "The Holdfasts",
        jobs: [
          { missionType: "Assassinate" },
          { missionType: "Survival" },
          { missionType: "Rescue" },
          { missionType: "Capture" },
          { missionType: "Exterminate" },
        ],
      },
    },
    want: true,
  },
  {
    name: "bounty level 5 ignores an Exterminate lower on the board",
    filter: { kind: "bounty", syndicates: null, level: 5, missionTypes: ["Exterminate"] },
    event: {
      kind: "bounty",
      payload: {
        syndicate: "Ostrons",
        jobs: [
          { missionType: "Exterminate" },
          { missionType: "Survival" },
          { missionType: "Rescue" },
          { missionType: "Capture" },
          { missionType: "Assassinate" },
        ],
      },
    },
    want: false,
  },
  {
    name: "bounty without a level looks at every job on the board",
    filter: { kind: "bounty", syndicates: null, level: null, missionTypes: ["Excavation"] },
    event: {
      kind: "bounty",
      payload: { syndicate: "Cavia", jobs: [{ missionType: "Survival" }, { missionType: "Excavation" }] },
    },
    want: true,
  },
  {
    name: "bounty from another syndicate never matches",
    filter: { kind: "bounty", syndicates: ["The Hex"], level: null, missionTypes: null },
    event: { kind: "bounty", payload: { syndicate: "Ostrons", jobs: [{ missionType: "Capture" }] } },
    want: false,
  },
  {
    name: "bounty level past the end of a short board never matches",
    filter: { kind: "bounty", syndicates: null, level: 5, missionTypes: null },
    event: { kind: "bounty", payload: { syndicate: "Cavia", jobs: [{ missionType: "Survival" }] } },
    want: false,
  },
  {
    name: "daily reset matches the daily period",
    filter: { kind: "reset", period: "daily" },
    event: { kind: "reset", payload: { period: "daily", date: "2026-08-30" } },
    want: true,
  },
  {
    name: "weekly reset does not match the daily period",
    filter: { kind: "reset", period: "weekly" },
    event: { kind: "reset", payload: { period: "daily", date: "2026-08-30" } },
    want: false,
  },
  {
    name: "sortie modifier matches the mission that carries it",
    filter: { kind: "sortie", boss: null, missionTypes: null, modifiers: ["Melee Only"] },
    event: {
      kind: "sortie",
      payload: {
        boss: "Vay Hek",
        missions: [
          { missionType: "Survival", modifier: "Eximus Stronghold" },
          { missionType: "Defense", modifier: "Melee Only" },
        ],
      },
    },
    want: true,
  },
  {
    name: "sortie without that modifier does not match",
    filter: { kind: "sortie", boss: null, missionTypes: null, modifiers: ["Melee Only"] },
    event: {
      kind: "sortie",
      payload: { boss: "Vay Hek", missions: [{ missionType: "Survival", modifier: "Eximus Stronghold" }] },
    },
    want: false,
  },
  {
    name: "arbitration on a mission type the player farms",
    filter: { kind: "arbitration", missionTypes: ["Defense", "Interception"], tiers: null },
    event: {
      kind: "arbitration",
      payload: { node: "Hydron (Sedna)", missionType: "Defense", faction: "Grineer", tier: "B" },
    },
    want: true,
  },
  {
    name: "arbitration on a mission type the player skips",
    filter: { kind: "arbitration", missionTypes: ["Defense"], tiers: null },
    event: {
      kind: "arbitration",
      payload: { node: "Cinxia (Ceres)", missionType: "Survival", faction: "Grineer", tier: "S" },
    },
    want: false,
  },
  {
    name: "arbitration on a top tier node",
    filter: { kind: "arbitration", missionTypes: null, tiers: ["S", "A"] },
    event: {
      kind: "arbitration",
      payload: { node: "Tyana Pass (Mars)", missionType: "Defense", faction: "Grineer", tier: "S" },
    },
    want: true,
  },
  {
    name: "arbitration on a node the Goons never rated",
    filter: { kind: "arbitration", missionTypes: null, tiers: ["S"] },
    event: {
      kind: "arbitration",
      payload: { node: "Sechura (Pluto)", missionType: "Defense", faction: "Corpus", tier: "" },
    },
    want: false,
  },
];

describe("matches", () => {
  test.each(cases)("$name", ({ filter, event, want }) => {
    expect(matches(filter, event)).toBe(want);
  });
});
