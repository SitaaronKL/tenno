import { describe, expect, test } from "vitest";
import raw from "./__fixtures__/pc.json";
import { normalize } from "./normalize";

// Fixture was captured live from api.warframestat.us/pc on 2026-08-29.
const FETCHED_AT = Date.parse("2026-08-30T01:17:00.000Z");
const state = normalize(raw as Record<string, unknown>, FETCHED_AT);

describe("normalize", () => {
  test("reports the platform and when it was fetched", () => {
    expect(state.platform).toBe("pc");
    expect(state.fetchedAt).toBe(FETCHED_AT);
  });

  test("keeps every fissure upstream sent, expiry is applied when the data is read", () => {
    expect(state.fissures).toHaveLength((raw as { fissures: unknown[] }).fissures.length);
    for (const fissure of state.fissures) {
      expect(fissure.node).not.toBe("");
      expect(["Lith", "Meso", "Neo", "Axi", "Requiem", "Omnia"]).toContain(fissure.tier);
    }
  });

  test("an hour old snapshot still carries its fissures and says it is stale", () => {
    const late = normalize(raw as Record<string, unknown>, FETCHED_AT + 60 * 60 * 1000);
    expect(late.fissures.length).toBeGreaterThan(0);
    expect(late.stale).toBe(true);
    expect(late.upstreamTimestamp).toBe(Date.parse("2026-08-30T01:28:47.000Z"));
  });

  test("a fresh snapshot is not stale", () => {
    expect(state.stale).toBe(false);
  });

  test("marks Steel Path and Void Storm fissures", () => {
    const thebe = state.fissures.find((f) => f.node === "Thebe (Jupiter)");
    expect(thebe).toMatchObject({ tier: "Meso", missionType: "Sabotage", steelPath: false, storm: false });
  });

  test("gives the alert its node and its reward", () => {
    const alert = state.alerts[0];
    expect(alert.node).toBe("Selkie (Sedna)");
    expect(alert.missionType).toBe("Survival");
    expect(alert.rewards).toContainEqual({ item: "Nakak Pearls", count: 175, credits: 0 });
  });

  test("gives each invasion both sides and its progress", () => {
    const invasion = state.invasions.find((i) => i.node === "Cerberus (Pluto)")!;
    expect(invasion.attacker.faction).toBe("Grineer");
    expect(invasion.defender.reward?.item).toBe("Fieldron");
    expect(invasion.completion).toBeGreaterThanOrEqual(0);
    expect(invasion.completion).toBeLessThanOrEqual(100);
  });

  test("gives the sortie its boss and three missions", () => {
    expect(state.sortie!.boss).toBe("Tyl Regor");
    expect(state.sortie!.missions).toHaveLength(3);
    expect(state.sortie!.missions[0]).toMatchObject({ node: "War (Mars)", missionType: "Rescue" });
  });

  test("gives the archon hunt its boss and missions", () => {
    expect(state.archonHunt!.boss).toBe("Archon Nira");
    expect(state.archonHunt!.missions.length).toBeGreaterThan(0);
    expect(state.archonHunt!.missions[0].node).toBe("Callisto (Jupiter)");
  });

  test("says where Baro is and whether he is here yet", () => {
    expect(state.baro).toMatchObject({ location: "Strata Relay (Earth)", active: false });
    expect(state.baro!.startsAt).toBeGreaterThan(FETCHED_AT);
  });

  test("lists the nightwave season and its active acts", () => {
    expect(state.nightwave!.season).toBe(18);
    const act = state.nightwave!.acts.find((a) => a.title === "Deep Impact")!;
    expect(act).toMatchObject({ daily: true, reputation: 1000 });
    expect(act.description).toContain("Heavy Slam");
  });

  test("lists all six world cycles with a state and an expiry", () => {
    expect(state.cycles.map((c) => c.world).sort()).toEqual([
      "cambion",
      "cetus",
      "duviri",
      "earth",
      "vallis",
      "zariman",
    ]);
    expect(state.cycles.find((c) => c.world === "cetus")!.state).toBe("day");
    expect(state.cycles.find((c) => c.world === "duviri")!.state).toBe("sorrow");
    for (const cycle of state.cycles) expect(cycle.expiresAt).toBeGreaterThan(0);
  });

  test("hides arbitration, which upstream serves as a broken placeholder", () => {
    expect(JSON.stringify(state)).not.toContain("SolNode000");
    expect(Object.keys(state)).not.toContain("arbitration");
  });

  test("builds the same bounty boards the DE reader builds", () => {
    // The fixed boards upstream sends empty are filled elsewhere, see staticBounties.test.ts.
    expect(state.bounties!.filter((b) => !b.static).map((b) => b.syndicate)).toEqual([
      "Ostrons",
      "Entrati",
      "Solaris United",
    ]);
    const ostron = state.bounties!.find((b) => b.syndicate === "Ostrons")!;
    expect(ostron.node).toBe("Cetus (Earth)");
    expect(ostron.expiresAt).toBe(Date.parse("2026-08-30T03:22:06.431Z"));
    expect(ostron.jobs[0]).toMatchObject({ level: "5 - 15", minLevel: 5, maxLevel: 15, standing: 1470 });
    // Upstream repeats the pool once per stage, a reader wants each reward named once.
    expect(ostron.jobs[0].rewards).toHaveLength(9);
    expect(ostron.jobs[0].rewards).toContain("Redirection");
  });
});
