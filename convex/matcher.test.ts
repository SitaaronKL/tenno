import { describe, expect, test } from "vitest";
import { matches } from "./matcher";
import type { RuleFilter } from "../lib/contracts/rule";

const cases: { name: string; filter: RuleFilter; event: { kind: string; payload: unknown }; want: boolean }[] = [
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
    filter: { kind: "sortie", boss: ["Tyl Regor"], missionTypes: ["Rescue"] },
    event: { kind: "sortie", payload: { boss: "Tyl Regor", missions: [{ missionType: "Rescue" }, { missionType: "Survival" }] } },
    want: true,
  },
  {
    name: "sortie boss right but mission type absent",
    filter: { kind: "sortie", boss: ["Tyl Regor"], missionTypes: ["Spy"] },
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
    filter: { kind: "cycle", world: "cetus", state: "night" },
    event: { kind: "cycle", payload: { world: "cetus", state: "night" } },
    want: true,
  },
  {
    name: "cycle right world wrong state",
    filter: { kind: "cycle", world: "cetus", state: "night" },
    event: { kind: "cycle", payload: { world: "cetus", state: "day" } },
    want: false,
  },
  {
    name: "cycle other world",
    filter: { kind: "cycle", world: "vallis", state: "warm" },
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
];

describe("matches", () => {
  test.each(cases)("$name", ({ filter, event, want }) => {
    expect(matches(filter, event)).toBe(want);
  });
});
