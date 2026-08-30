import { describe, expect, test } from "vitest";
import raw from "./__fixtures__/de.json";
import { bountyMissionType, normalizeDe } from "./de";
import { currentArbitration, todaysIncursions } from "./schedules";

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

  test("lists a bounty board per open world syndicate, in board order", () => {
    // The fixed boards DE sends empty are filled elsewhere, convex/ingest/staticBounties.test.ts.
    const live = state.bounties!.filter((b) => !b.static);
    expect(live.map((b) => b.syndicate)).toEqual(["Entrati", "Ostrons", "Solaris United"]);
    for (const bounty of live) {
      expect(bounty.node).not.toBe("");
      expect(bounty.expiresAt).toBe(Date.parse("2026-08-30T05:52:05.306Z"));
      expect(bounty.jobs.length).toBeGreaterThan(0);
    }
    expect(state.bounties!.find((b) => b.syndicate === "Ostrons")!.node).toBe("Cetus (Earth)");
    expect(state.bounties!.find((b) => b.syndicate === "Entrati")!.node).toBe("Necralisk (Deimos)");
  });

  test("reads each job's level range and the standing the whole run pays", () => {
    const ostron = state.bounties!.find((b) => b.syndicate === "Ostrons")!;
    expect(ostron.jobs).toHaveLength(7);
    expect(ostron.jobs[0]).toMatchObject({ level: "5 - 15", minLevel: 5, maxLevel: 15, standing: 1020 });
    expect(ostron.jobs.at(-1)).toMatchObject({ level: "50 - 70", minLevel: 50, maxLevel: 70 });
  });

  test("names every bounty reward, no /Lotus paths and no table ids", () => {
    const jobs = state.bounties!.filter((b) => !b.static).flatMap((b) => b.jobs);
    expect(jobs).toHaveLength(23);
    for (const job of jobs) {
      expect(job.rewards.length).toBeGreaterThan(0);
      for (const reward of job.rewards) expect(reward).not.toMatch(/Lotus|Rewards$/);
    }
    const ostron = state.bounties!.find((b) => b.syndicate === "Ostrons")!;
    expect(ostron.jobs[0].rewards).toContain("Pressure Point");
    // Deimos and Narmer tables are absent from the language table, they resolve through drop data.
    const entrati = state.bounties!.find((b) => b.syndicate === "Entrati")!;
    expect(entrati.jobs.at(-1)!.rewards).toContain("Sporothrix Blueprint");
  });

  test("derives a friendly mission type for every job that names one", () => {
    const ostron = state.bounties!.find((b) => b.syndicate === "Ostrons")!;
    expect(ostron.jobs.map((j) => j.missionType)).toEqual([
      "Capture",
      "Sabotage",
      "Sabotage",
      "Capture",
      "Exterminate",
      "Rescue",
      "Assassinate",
    ]);

    const solaris = state.bounties!.find((b) => b.syndicate === "Solaris United")!;
    expect(solaris.jobs.map((j) => j.missionType)).toEqual([
      "Excavation",
      "Spy",
      "Assassinate",
      "Assassinate",
      "Spy",
      "Recovery",
      "Exterminate",
    ]);

    const entrati = state.bounties!.find((b) => b.syndicate === "Entrati")!;
    expect(entrati.jobs.slice(0, 6).map((j) => j.missionType)).toEqual([
      "Survival",
      "Survival",
      "Defense",
      "Assassinate",
      "Excavation",
      "Defense",
    ]);
    // Isolation Vault runs carry no job path, so they carry no mission type either.
    expect(entrati.jobs.slice(6).every((j) => j.missionType === undefined)).toBe(true);
  });

  test("reads the Zariman style path the fixture does not carry", () => {
    expect(bountyMissionType("/Lotus/Types/Gameplay/Zariman/Jobs/ZarimanBadLandscapeExterminateBounty")).toBe(
      "Exterminate",
    );
    expect(bountyMissionType("")).toBe("");
  });
});

describe("Archimedea", () => {
  const deep = state.archimedea!.find((a) => a.variant === "deep")!;
  const temporal = state.archimedea!.find((a) => a.variant === "temporal")!;

  test("reads both weekly sets and keys them by variant and expiry", () => {
    expect(state.archimedea).toHaveLength(2);
    expect(deep.key).toBe("deep:1788134400000");
    expect(temporal.key).toBe("temporal:1788134400000");
    expect(deep.expiresAt).toBe(1788134400000);
  });

  test("names the three Deep Archimedea missions, deviations and risks", () => {
    expect(deep.missions).toEqual([
      { missionType: "Alchemy", deviation: "Hazardous Goods", risks: ["Hostile Regeneration"] },
      { missionType: "Survival", deviation: "Parasitic Towers", risks: ["Devil's Bargain"] },
      { missionType: "Defense", deviation: "Glyph Inflation", risks: ["Fortified Foes"] },
    ]);
  });

  test("carries the personal modifiers as printed names", () => {
    expect(deep.personalModifiers).toEqual([
      "Knifestep Syndrome",
      "Untreatable",
      "Abbreviated Abilities",
      "Energy Exhaustion",
    ]);
  });

  test("elite adds one risk per mission, in mission order", () => {
    expect(deep.eliteBonus).toEqual(["Vampyric Liminus", "Entanglement", "Explosive Potential"]);
  });

  test("the Hex set reads as temporal with its own mission types", () => {
    expect(temporal.missions.map((m) => m.missionType)).toEqual([
      "Extermination",
      "Legacyte Harvest",
      "Defense",
    ]);
    expect(temporal.eliteBonus).toEqual([
      "Devil's Bargain",
      "Artillery Beacons",
      "Competitive Streak",
    ]);
  });
});

describe("daily and weekly extras", () => {
  test("shows the six Steel Path Incursions for the UTC day of the snapshot", () => {
    expect(state.incursions).toEqual(todaysIncursions(FETCHED_AT));
    expect(state.incursions).toHaveLength(6);
  });

  test("shows the arbitration running at the snapshot's hour", () => {
    expect(state.arbitration).toEqual(currentArbitration(FETCHED_AT));
    expect(state.arbitration?.expiresAt).toBe(Date.parse("2026-08-30T05:00:00.000Z"));
  });

  test("reads the Circuit's frames and weapons out of EndlessXpSchedule", () => {
    expect(state.circuit).toEqual({
      normal: ["Nidus", "Octavia", "Harrow"],
      steelPath: ["Vectis", "Stug", "Ballistica", "Destreza", "Obex"],
      expiresAt: 1788134400000,
    });
  });

  test("names Darvo's deal and says how much of it is left", () => {
    expect(state.darvo).toEqual({
      item: "Akbronco",
      discount: 30,
      stock: 164,
      expiresAt: 1788066000000,
    });
  });

  test("names the running event from Goals, with its expiry", () => {
    expect(state.events).toEqual([
      {
        key: "6a71fe700000000000000000",
        name: "Tactical Alert: Dog Days",
        expiresAt: 1788879600000,
      },
    ]);
  });
});
