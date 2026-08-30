import { describe, expect, test } from "vitest";
import type { BountyCycle } from "../../lib/contracts/worldstate";
import cycle from "./__fixtures__/bounty-cycle.json";
import raw from "./__fixtures__/de.json";
import { challengeLabel, parseCycle, withBountyCycle } from "./bountyCycle";
import { normalizeDe } from "./de";

const FETCHED_AT = Date.parse("2026-08-30T04:21:00.000Z");
const de = normalizeDe(raw as unknown as Record<string, unknown>, FETCHED_AT);
const sample = parseCycle(cycle)!;

describe("challengeLabel", () => {
  test("the mapped stems read as sentences", () => {
    expect(challengeLabel("/Lotus/Types/Challenges/Zariman/ZarimanFloodCompleteWavesEasyChallenge"))
      .toBe("Void Flood, complete waves");
    expect(challengeLabel("/Lotus/Types/Challenges/Zariman/ZarimanExterminateNoPowersChallenge"))
      .toBe("Exterminate without abilities");
    expect(challengeLabel("/Lotus/Types/Challenges/Zariman/ZarimanKillCorpusChallenge"))
      .toBe("Kill Corpus");
    expect(challengeLabel("/Lotus/Types/Challenges/Zariman/ZarimanDefeatVoidAngelChallenge"))
      .toBe("Defeat the Void Angel");
  });

  test("a stem nobody mapped still reads, split on the camel case", () => {
    expect(challengeLabel("/Lotus/Types/Challenges/Zariman/ZarimanRideTheBusHardChallenge"))
      .toBe("Ride the bus");
  });

  test("an empty path leaves the job without a challenge", () => {
    expect(challengeLabel("")).toBe("");
  });
});

describe("parseCycle", () => {
  test("the oracle's shape comes back typed", () => {
    expect(sample.rot).toBe("A");
    expect(sample.expiry).toBe(1788087123055);
    expect(sample.bounties.ZarimanSyndicate).toHaveLength(5);
  });

  test("anything that is not a cycle is refused", () => {
    expect(parseCycle({ rot: "A" })).toBeNull();
    expect(parseCycle(null)).toBeNull();
  });
});

describe("withBountyCycle", () => {
  const state = withBountyCycle(de, sample);
  const board = (syndicate: string) => state.bounties!.find((b) => b.syndicate === syndicate)!;

  test("the cycle is kept on the snapshot", () => {
    expect(state.bountyCycle).toEqual(sample);
  });

  test("Zariman jobs take the mission type of their node, not Bounty", () => {
    const jobs = board("The Holdfasts").jobs;
    expect(jobs.map((j) => j.missionType)).toEqual([
      "Void Flood",
      "Mobile Defense",
      "Void Armageddon",
      "Extermination",
      "Void Cascade",
    ]);
    expect(jobs[0].node).toBe("Everview Arc (Zariman)");
    expect(jobs[0].challenge).toBe("Void Flood, complete waves");
  });

  test("Cavia and the Hex are mapped from the same cycle", () => {
    expect(board("Cavia").jobs[0].node).toBe("Effervo (Deimos)");
    expect(board("Cavia").jobs[0].missionType).toBe("Assassination");
    expect(board("The Hex").jobs[0].missionType).toBe("Survival");
    expect(board("The Hex").jobs[0].challenge).toBe("Destroy the speakers");
  });

  test("the boards run to the cycle's expiry and name their rotation", () => {
    for (const syndicate of ["The Holdfasts", "Cavia", "The Hex"]) {
      expect(board(syndicate).expiresAt).toBe(sample.expiry);
      expect(board(syndicate).rotation).toBe("A");
    }
  });

  test("Vox Solaris has no entry in the cycle, so it is left alone", () => {
    const vox = board("Vox Solaris");
    expect(vox.rotation).toBeUndefined();
    expect(vox.jobs[0].node).toBeUndefined();
    expect(vox.expiresAt).toBe(de.bounties!.find((b) => b.syndicate === "Vox Solaris")!.expiresAt);
  });

  test("live boards are untouched", () => {
    for (const live of state.bounties!.filter((b) => !b.static)) {
      for (const job of live.jobs) expect(job.node).toBeUndefined();
    }
  });

  test("a cycle with more entries than the board has jobs fills what it can", () => {
    const short: BountyCycle = { ...sample, bounties: { ZarimanSyndicate: [sample.bounties.ZarimanSyndicate[0]] } };
    const jobs = withBountyCycle(de, short).bounties!.find((b) => b.syndicate === "The Holdfasts")!.jobs;
    expect(jobs[0].missionType).toBe("Void Flood");
    expect(jobs[1].missionType).toBeUndefined();
  });
});
