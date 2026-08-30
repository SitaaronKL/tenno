import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WorldState } from "@/lib/contracts/worldstate";
import { Panels } from "./dashboard-grid";

const now = Date.now();

function state(over: Partial<WorldState> = {}): WorldState {
  return {
    platform: "pc",
    fetchedAt: now,
    upstreamTimestamp: now,
    stale: false,
    fissures: [],
    alerts: [],
    invasions: [],
    sortie: null,
    archonHunt: null,
    baro: null,
    nightwave: null,
    cycles: [],
    ...over,
  };
}

describe("dashboard", () => {
  it("says nothing about age while the feed is current", () => {
    render(<Panels state={state()} />);
    expect(screen.queryByText(/minutes old/)).not.toBeInTheDocument();
  });

  it("tells the user how old the data is when upstream lags", () => {
    render(<Panels state={state({ stale: true, upstreamTimestamp: now - 25 * 60_000 })} />);
    expect(
      screen.getByText("Data is 25 minutes old, upstream is lagging"),
    ).toBeInTheDocument();
  });

  it("credits DE when the feed came from DE's own endpoint", () => {
    render(
      <Panels state={state({ stale: true, source: "de", upstreamTimestamp: now - 25 * 60_000 })} />,
    );
    expect(screen.getByText(/Live from Digital Extremes/)).toBeInTheDocument();
  });
});

describe("daily and weekly extras", () => {
  it("shows the incursion and weekly boxes, and names a running event", () => {
    render(
      <Panels
        state={state({
          incursions: ["Tyana Pass (Mars)"],
          events: [{ key: "a", name: "Tactical Alert: Dog Days", expiresAt: now + 86_400_000 }],
        })}
      />,
    );
    expect(screen.getByText("Incursions")).toBeInTheDocument();
    expect(screen.getByText("Weekly")).toBeInTheDocument();
    expect(screen.getByText(/Tactical Alert: Dog Days/)).toBeInTheDocument();
  });
});
