import { describe, expect, test } from "vitest";
import raw from "./__fixtures__/de.json";
import pc from "./__fixtures__/pc.json";
import { normalizeDe } from "./de";
import { normalize } from "./normalize";
import { nextRotation, withStaticBounties } from "./staticBounties";

// Both fixtures list the Zariman, Entrati Lab, Vox Solaris and Höllvania boards with zero jobs.
const FETCHED_AT = Date.parse("2026-08-30T04:21:00.000Z");
const de = normalizeDe(raw as unknown as Record<string, unknown>, FETCHED_AT);
// The warframestat fixture is an older capture, its boards expire on their own clock.
const PC_FETCHED_AT = Date.parse("2026-08-30T01:17:00.000Z");
const warframestat = normalize(pc as unknown as Record<string, unknown>, PC_FETCHED_AT);

describe("fixed boards", () => {
  test("DE's empty boards come back filled from the drop tables", () => {
    const filled = de.bounties!.filter((b) => b.static);
    expect(filled.map((b) => b.syndicate)).toEqual([
      "The Holdfasts",
      "Cavia",
      "Vox Solaris",
      "The Hex",
    ]);
    const holdfasts = filled.find((b) => b.syndicate === "The Holdfasts")!;
    expect(holdfasts.node).toBe("Chrysalith (Zariman)");
    expect(holdfasts.jobs).toHaveLength(5);
    expect(holdfasts.jobs[0]).toMatchObject({ level: "50 - 55", minLevel: 50, maxLevel: 55 });
    expect(holdfasts.jobs[0].rewards).toContain("Voidplume Down");

    const cavia = filled.find((b) => b.syndicate === "Cavia")!;
    expect(cavia.node).toBe("Sanctum Anatomica (Deimos)");
    expect(cavia.jobs.map((j) => j.level)).toEqual([
      "55 - 60",
      "65 - 70",
      "75 - 80",
      "95 - 100",
      "115 - 120",
    ]);
  });

  test("every filled job carries its chance table, live jobs carry none", () => {
    const holdfasts = de.bounties!.find((b) => b.syndicate === "The Holdfasts")!;
    const rotationC = holdfasts.jobs[0].rewardTable!.find((r) => r.rotation === "C")!;
    expect(rotationC.rewards).toContainEqual({ item: "Aya", chance: 8.7 });
    // The rules engine only reads names, so the flat list mirrors the table.
    expect(holdfasts.jobs[0].rewards).toEqual(
      holdfasts.jobs[0].rewardTable!.flatMap((r) => r.rewards.map((x) => x.item)),
    );
    const ostrons = de.bounties!.find((b) => b.syndicate === "Ostrons")!;
    for (const job of ostrons.jobs) expect(job.rewardTable).toBeUndefined();
  });

  test("Profit Taker phases repeat a level, so each one names itself", () => {
    const vox = de.bounties!.find((b) => b.syndicate === "Vox Solaris")!;
    expect(vox.jobs.map((j) => j.title)).toEqual([
      "Profit Taker Phase 1",
      "Profit Taker Phase 2",
      "Profit Taker Phase 3",
      "Profit Taker Phase 4",
    ]);
  });

  test("live boards are untouched", () => {
    const live = de.bounties!.filter((b) => !b.static);
    expect(live.map((b) => b.syndicate)).toEqual(["Entrati", "Ostrons", "Solaris United"]);
    for (const board of live) {
      expect(board.jobs.length).toBeGreaterThan(0);
      expect(board.expiresAt).toBe(Date.parse("2026-08-30T05:52:05.306Z"));
    }
  });

  test("a filled board expires when upstream says its rotation does", () => {
    const holdfasts = de.bounties!.find((b) => b.syndicate === "The Holdfasts")!;
    expect(holdfasts.expiresAt).toBe(Date.parse("2026-08-30T05:52:05.306Z"));
  });

  test("with no upstream expiry the board runs to the next rotation boundary", () => {
    const filled = withStaticBounties([], {}, FETCHED_AT);
    expect(filled[0].expiresAt).toBe(nextRotation(FETCHED_AT));
    expect(nextRotation(FETCHED_AT)).toBeGreaterThan(FETCHED_AT);
    expect(nextRotation(FETCHED_AT) - FETCHED_AT).toBeLessThanOrEqual(9_000_000);
  });

  test("an expiry already past is replaced by the next boundary", () => {
    const filled = withStaticBounties([], { "The Holdfasts": FETCHED_AT - 1000 }, FETCHED_AT);
    expect(filled[0].expiresAt).toBe(nextRotation(FETCHED_AT));
  });

  test("a board upstream does fill stays live", () => {
    const live = [
      { syndicate: "Cavia", node: "Sanctum Anatomica (Deimos)", expiresAt: FETCHED_AT + 1000, jobs: [] },
    ];
    const filled = withStaticBounties(live, {}, FETCHED_AT);
    expect(filled.filter((b) => b.syndicate === "Cavia")).toHaveLength(1);
    expect(filled.find((b) => b.syndicate === "Cavia")!.static).toBeUndefined();
  });

  test("the warframestat path fills the same boards", () => {
    const filled = warframestat.bounties!.filter((b) => b.static);
    expect(filled.map((b) => b.syndicate)).toEqual([
      "The Holdfasts",
      "Cavia",
      "Vox Solaris",
      "The Hex",
    ]);
    expect(filled[0].expiresAt).toBe(Date.parse("2026-08-30T03:22:06.431Z"));
  });
});
