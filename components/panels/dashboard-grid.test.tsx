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
});
