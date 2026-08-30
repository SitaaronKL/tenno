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

describe("a board that lists the same level range twice", () => {
  it("renders both jobs rather than collapsing them into one", async () => {
    const user = userEvent.setup();
    const board = [
      {
        syndicate: "Entrati",
        node: "Necralisk (Deimos)",
        expiresAt: Date.now() + 3_600_000,
        jobs: [
          { level: "30 - 40", minLevel: 30, maxLevel: 40, standing: 4000, rewards: ["Arcane"] },
          { level: "30 - 40", minLevel: 30, maxLevel: 40, standing: 5000, rewards: ["Vault mod"] },
        ],
      },
    ];
    render(<BountiesPanel bounties={board} />);
    await user.click(screen.getByRole("button", { name: /Entrati/ }));

    expect(screen.getByText("Arcane")).toBeInTheDocument();
    expect(screen.getByText("Vault mod")).toBeInTheDocument();
  });
});

describe("a fixed board", () => {
  const fixed: Bounty[] = [
    {
      syndicate: "The Holdfasts",
      node: "Chrysalith (Zariman)",
      expiresAt: now + 3_600_000,
      static: true,
      jobs: [
        {
          level: "50 - 55",
          minLevel: 50,
          maxLevel: 55,
          standing: 0,
          rewards: ["Aya", "Voidplume Down"],
          rewardTable: [
            { rotation: "A", rewards: [{ item: "Voidplume Down", chance: 13.04 }] },
            { rotation: "C", rewards: [{ item: "Aya", chance: 8.7 }] },
          ],
        },
      ],
    },
  ];

  it("says the board is fixed rather than pretending it rotates", () => {
    render(<BountiesPanel bounties={fixed} />);
    expect(screen.getByText("fixed board")).toBeInTheDocument();
  });

  it("groups the rewards by rotation with their chances", async () => {
    const user = userEvent.setup();
    render(<BountiesPanel bounties={fixed} />);
    await user.click(screen.getByRole("button", { name: /Holdfasts/ }));
    expect(screen.getByText("Rotation A")).toBeInTheDocument();
    expect(screen.getByText("Rotation C")).toBeInTheDocument();
    expect(screen.getByText("Voidplume Down")).toBeInTheDocument();
    expect(screen.getByText("13.04%")).toBeInTheDocument();
    expect(screen.getByText("8.7%")).toBeInTheDocument();
  });

  it("leaves standing out when the board does not print it", async () => {
    const user = userEvent.setup();
    render(<BountiesPanel bounties={fixed} />);
    await user.click(screen.getByRole("button", { name: /Holdfasts/ }));
    expect(screen.queryByText(/0 standing/)).not.toBeInTheDocument();
    expect(screen.getByText(/lvl 50 to 55/)).toBeInTheDocument();
  });
});
