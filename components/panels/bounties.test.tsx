import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Bounty } from "@/lib/contracts/worldstate";
import { BountiesPanel } from "./bounties";

const now = Date.now();

const fixture: Bounty[] = [
  {
    syndicate: "Ostron",
    node: "Cetus",
    expiresAt: now + 3_600_000,
    jobs: [
      {
        level: "Tier 1",
        minLevel: 5,
        maxLevel: 15,
        rewards: ["Nitain Extract", "Cetus Wisp"],
        standing: 1000,
      },
      { level: "Tier 5", minLevel: 40, maxLevel: 60, rewards: ["Gara Chassis"], standing: 5000 },
    ],
  },
];

describe("Bounties card", () => {
  it("shows the syndicate and where to pick the bounty up", () => {
    render(<BountiesPanel bounties={fixture} />);
    expect(screen.getByText("Ostron")).toBeInTheDocument();
    expect(screen.getByText("Cetus")).toBeInTheDocument();
  });

  it("opens a syndicate to reveal its jobs, levels and standing", async () => {
    const user = userEvent.setup();
    render(<BountiesPanel bounties={fixture} />);
    await user.click(screen.getByRole("button", { name: /Ostron/ }));
    expect(screen.getByText("Tier 1")).toBeInTheDocument();
    expect(screen.getByText("Nitain Extract, Cetus Wisp")).toBeInTheDocument();
    expect(screen.getByText(/lvl 5 to 15/)).toBeInTheDocument();
    expect(screen.getByText(/1000 standing/)).toBeInTheDocument();
  });

  it("says so when no syndicate is offering", () => {
    render(<BountiesPanel bounties={[]} />);
    expect(screen.getByText("No bounties offered.")).toBeInTheDocument();
  });
});
