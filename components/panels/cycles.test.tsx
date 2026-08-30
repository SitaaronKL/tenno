import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Cycle } from "@/lib/contracts/worldstate";
import { HiddenSet } from "@/components/hidden";

import { CycleTiles, nextDailyReset, nextWeeklyReset } from "./cycles";

describe("reset timers", () => {
  it("daily reset is the next midnight UTC", () => {
    const now = Date.UTC(2026, 7, 30, 7, 15);
    expect(new Date(nextDailyReset(now)).toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });
  it("weekly reset is the next Monday midnight UTC, a Monday morning points a week ahead", () => {
    expect(new Date(nextWeeklyReset(Date.UTC(2026, 7, 30, 7))).toISOString()).toBe("2026-08-31T00:00:00.000Z");
    expect(new Date(nextWeeklyReset(Date.UTC(2026, 7, 31, 1))).toISOString()).toBe("2026-09-07T00:00:00.000Z");
  });
});

describe("the tile row", () => {
  const cycles: Cycle[] = [
    { world: "cetus", state: "day", expiresAt: Date.now() + 600_000 },
    { world: "vallis", state: "warm", expiresAt: Date.now() + 600_000 },
  ];

  it("draws a tile per cycle plus the two resets", () => {
    render(<CycleTiles cycles={cycles} />);
    expect(screen.getByText("Cetus")).toBeInTheDocument();
    expect(screen.getByText("Orb Vallis")).toBeInTheDocument();
    expect(screen.getByText("Daily reset")).toBeInTheDocument();
  });

  it("drops a tile the user turned off", () => {
    render(
      <HiddenSet hidden={new Set(["tile.cetus", "tile.daily"])}>
        <CycleTiles cycles={cycles} />
      </HiddenSet>,
    );
    expect(screen.queryByText("Cetus")).not.toBeInTheDocument();
    expect(screen.queryByText("Daily reset")).not.toBeInTheDocument();
    expect(screen.getByText("Orb Vallis")).toBeInTheDocument();
  });

  it("drops the arbitration tile too", () => {
    render(
      <HiddenSet hidden={new Set(["tile.arbitration"])}>
        <CycleTiles
          cycles={cycles}
          arbitration={{
            node: "Hydron (Sedna)",
            missionType: "Defense",
            faction: "Grineer",
            tier: "B",
            expiresAt: Date.now() + 1_200_000,
          }}
        />
      </HiddenSet>,
    );
    expect(screen.queryByText("Arbitration")).not.toBeInTheDocument();
  });
});

describe("arbitration tile", () => {
  it("sits with the cycle tiles, named by its mission type", () => {
    render(
      <CycleTiles
        cycles={[]}
        arbitration={{
          node: "Hydron (Sedna)",
          missionType: "Defense",
          faction: "Grineer",
          tier: "B",
          expiresAt: Date.now() + 1_200_000,
        }}
      />,
    );
    expect(screen.getByText("Arbitration")).toBeInTheDocument();
    expect(screen.getByText("Defense")).toBeInTheDocument();
  });

  it("leaves the tile out when the schedule has run out", () => {
    render(<CycleTiles cycles={[]} arbitration={null} />);
    expect(screen.queryByText("Arbitration")).not.toBeInTheDocument();
  });
});

describe("cycle roll forward", () => {
  it("walks an expired Cetus night into the next day with the right end time", async () => {
    const { rollCycle } = await import("./cycles");
    const end = Date.UTC(2026, 7, 30, 8, 0);
    const rolled = rollCycle({ world: "cetus", state: "night", expiresAt: end }, end + 10 * 60_000);
    expect(rolled.state).toBe("day");
    expect(rolled.expiresAt).toBe(end + 100 * 60_000);
  });
  it("leaves a live cycle alone", async () => {
    const { rollCycle } = await import("./cycles");
    const c = { world: "earth" as const, state: "day", expiresAt: Date.now() + 60_000 };
    expect(rollCycle(c, Date.now())).toEqual(c);
  });
});
