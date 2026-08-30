import { describe, expect, test } from "vitest";
import raw from "./__fixtures__/de.json";
import { normalizeDe } from "./de";

// Fixture was captured live from api.warframe.com/cdn/worldState.php on 2026-08-30.
const FETCHED_AT = Date.parse("2026-08-30T04:21:00.000Z");
const state = normalizeDe(raw as unknown as Record<string, unknown>, FETCHED_AT);

describe("normalizeDe", () => {
  test("reads DE's own timestamp and says the feed came from DE", () => {
    expect(state.platform).toBe("pc");
    expect(state.source).toBe("de");
    expect(state.upstreamTimestamp).toBe(Date.parse("2026-08-30T04:20:27.000Z"));
    expect(state.stale).toBe(false);
  });

  test("an hour later the same snapshot reads as stale", () => {
    const late = normalizeDe(raw as unknown as Record<string, unknown>, FETCHED_AT + 60 * 60 * 1000);
    expect(late.stale).toBe(true);
    expect(late.fissures.length).toBe(state.fissures.length);
  });

  test("turns DE's internal ids into names a player would recognise", () => {
    const valefor = state.fissures.find((f) => f.node === "Valefor (Europa)")!;
    expect(valefor).toMatchObject({
      tier: "Neo",
      missionType: "Excavation",
      enemy: "Corpus",
      steelPath: false,
      storm: false,
    });
    expect(valefor.startsAt).toBe(1788058322464);
    expect(valefor.expiresAt).toBe(1788064047615);
  });

  test("carries every fissure, Steel Path and Void Storm alike", () => {
    expect(state.fissures).toHaveLength(35);
    expect(state.fissures.filter((f) => f.steelPath)).toHaveLength(14);
    const storm = state.fissures.find((f) => f.node === "Sovereign Grasp (Neptune)")!;
    expect(storm).toMatchObject({ storm: true, tier: "Neo", missionType: "Volatile" });
    for (const fissure of state.fissures) {
      expect(fissure.node).not.toMatch(/SolNode|CrewBattleNode/);
      expect(fissure.missionType).not.toBe("");
    }
  });

  test("gives the alert its node and its reward", () => {
    const alert = state.alerts[0];
    expect(alert.node).toBe("Selkie (Sedna)");
    expect(alert.missionType).toBe("Survival");
    expect(alert.enemy).toBe("Grineer");
    expect(alert.rewards).toContainEqual({ item: "Nakak Pearls", count: 175, credits: 0 });
    expect(alert.rewards).toContainEqual({ item: "Credits", count: 1, credits: 50000 });
  });

  test("gives each invasion both sides and its progress", () => {
    const invasion = state.invasions.find((i) => i.node === "Cerberus (Pluto)")!;
    expect(invasion.description).toBe("Grineer Offensive");
    expect(invasion.attacker).toEqual({
      faction: "Grineer",
      reward: { item: "Detonite Injector", count: 3, credits: 0 },
    });
    expect(invasion.defender.faction).toBe("Corpus");
    expect(invasion.defender.reward?.item).toBe("Fieldron");
    expect(invasion.completion).toBeCloseTo(11.57, 1);
  });

  test("names the sortie boss and spells out each modifier", () => {
    expect(state.sortie).toMatchObject({ boss: "Tyl Regor", faction: "Grineer" });
    expect(state.sortie!.missions).toHaveLength(3);
    expect(state.sortie!.missions[0]).toEqual({
      node: "War (Mars)",
      missionType: "Rescue",
      modifier: "Eximus Stronghold",
    });
  });

  test("reads the archon hunt out of LiteSorties", () => {
    expect(state.archonHunt).toMatchObject({ boss: "Archon Nira", faction: "Narmer" });
    expect(state.archonHunt!.missions.map((m) => m.missionType)).toEqual([
      "Rescue",
      "Survival",
      "Assassination",
    ]);
  });

  test("says where Baro will be and that he is not here yet", () => {
    expect(state.baro).toMatchObject({
      location: "Strata Relay (Earth)",
      active: false,
      inventory: [],
    });
    expect(state.baro!.startsAt).toBe(1788526800000);
  });

  test("titles every nightwave act and scores it", () => {
    expect(state.nightwave!.season).toBe(18);
    expect(state.nightwave!.acts).toHaveLength(10);
    const daily = state.nightwave!.acts[0];
    expect(daily).toMatchObject({
      title: "Deep Impact",
      description: "Suspend 5 or more enemies in the air at once with a Heavy Slam Melee Attack",
      daily: true,
      reputation: 1000,
    });
    const elite = state.nightwave!.acts.find((a) => a.title === "Rise of the Machine")!;
    expect(elite).toMatchObject({ daily: false, reputation: 7000 });
    const weekly = state.nightwave!.acts.find((a) => a.title === "Animator")!;
    expect(weekly.reputation).toBe(4500);
  });

  test("computes all six cycles, Cetus and Cambion off the Ostron bounty clock", () => {
    expect(state.cycles.map((c) => c.world)).toEqual([
      "cetus",
      "vallis",
      "cambion",
      "earth",
      "duviri",
      "zariman",
    ]);
    const byWorld = Object.fromEntries(state.cycles.map((c) => [c.world, c]));
    expect(byWorld.cetus).toMatchObject({
      state: "day",
      expiresAt: Date.parse("2026-08-30T05:02:00.000Z"),
    });
    expect(byWorld.cambion).toMatchObject({ state: "fass", expiresAt: byWorld.cetus.expiresAt });
    expect(byWorld.earth).toMatchObject({
      state: "night",
      expiresAt: Date.parse("2026-08-30T08:00:00.000Z"),
    });
    expect(byWorld.vallis.state).toBe("cold");
    expect(byWorld.duviri).toMatchObject({
      state: "joy",
      expiresAt: Date.parse("2026-08-30T06:00:00.000Z"),
    });
    expect(byWorld.zariman).toMatchObject({
      state: "grineer",
      expiresAt: Date.parse("2026-08-30T05:52:00.000Z"),
    });
  });
});
