import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
