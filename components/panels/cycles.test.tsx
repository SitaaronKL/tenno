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
});
