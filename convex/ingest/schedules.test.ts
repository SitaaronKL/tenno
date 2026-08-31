import { describe, expect, it } from "vitest";

import { ARBITRATIONS as arbitrations, INCURSIONS as incursions } from "./scheduleData";
import { currentArbitration, todaysIncursions } from "./schedules";

// The shipped tables are re-trimmed by scripts/refresh-schedules.mjs, so the tests ask them
// where they start rather than naming a date that goes out of the window a month from now.
const firstDay = incursions.from * 1000;
const firstHour = arbitrations.from * 1000;

describe("Steel Path incursions", () => {
  it("gives the six nodes of the UTC day, by friendly name", () => {
    const nodes = todaysIncursions(firstDay + 13 * 3_600_000);
    expect(nodes).toHaveLength(6);
    // A friendly name is "Node (Planet)", an untranslated one is still a SolNode id.
    for (const node of nodes) expect(node).toMatch(/\(.+\)$/);
  });

  it("rolls over at midnight UTC, not at the hour", () => {
    const today = todaysIncursions(firstDay + 23 * 3_600_000);
    expect(todaysIncursions(firstDay + 60_000)).toEqual(today);
    expect(todaysIncursions(firstDay + 24 * 3_600_000)).not.toEqual(today);
  });

  it("says nothing rather than guessing once the schedule runs out", () => {
    expect(todaysIncursions(firstDay - 86_400_000)).toEqual([]);
    expect(todaysIncursions(firstDay + incursions.days.length * 86_400_000)).toEqual([]);
  });
});

describe("arbitration", () => {
  it("names the node, the mission and the faction for this hour", () => {
    const arbitration = currentArbitration(firstHour + 59 * 60_000);
    expect(arbitration).not.toBeNull();
    expect(arbitration?.node).toMatch(/\(.+\)$/);
    expect(arbitration?.missionType).not.toBe("");
    expect(arbitration?.faction).not.toBe("");
  });

  it("expires on the next hour boundary", () => {
    expect(currentArbitration(firstHour + 61_000)?.expiresAt).toBe(firstHour + 3_600_000);
  });

  it("moves to another node on the hour", () => {
    const first = currentArbitration(firstHour);
    const second = currentArbitration(firstHour + 3_600_000);
    expect(second?.node).not.toBe(first?.node);
  });

  it("carries the Arbitration Goons tier when the node has one, and no tier when it does not", () => {
    const tiers = arbitrations.hours
      .slice(0, 48)
      .map((_, i) => currentArbitration(firstHour + i * 3_600_000)?.tier);
    expect(tiers.some((tier) => /^[SA-F]$/.test(tier ?? ""))).toBe(true);
    expect(tiers.every((tier) => tier === "" || /^[SA-F]$/.test(tier ?? ""))).toBe(true);
  });

  it("says nothing rather than guessing once the schedule runs out", () => {
    expect(currentArbitration(firstHour - 3_600_000)).toBeNull();
    expect(currentArbitration(firstHour + arbitrations.hours.length * 3_600_000)).toBeNull();
  });
});
