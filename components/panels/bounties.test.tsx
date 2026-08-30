import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Bounty } from "@/lib/contracts/worldstate";
import { HiddenSet } from "@/components/hidden";
import { BountiesPanel } from "./bounties";

const now = Date.now();

const fixture: Bounty[] = [
  {
    syndicate: "Ostron",
    node: "Cetus",
    expiresAt: now + 3_600_000,
    jobs: [
      {
        level: "5 - 15",
        minLevel: 5,
        maxLevel: 15,
        missionType: "Rescue",
        rewards: ["Nitain Extract", "Cetus Wisp"],
        standing: 1000,
      },
      {
        level: "40 - 60",
        minLevel: 40,
        maxLevel: 60,
        missionType: "Assassination",
        rewards: ["Gara Chassis"],
        standing: 5000,
      },
    ],
  },
];

// One board shows at a time, the toggle only exists when there is more than one.
async function pickBoard(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  const radio = screen.queryByRole("radio", { name });
  if (radio) await user.click(radio);
}

describe("Bounties card", () => {
  it("shows the syndicate and where to pick the bounty up", () => {
    render(<BountiesPanel bounties={fixture} />);
    expect(screen.getByText("Ostron")).toBeInTheDocument();
    expect(screen.getAllByText(/Cetus/).length).toBeGreaterThan(0);
  });

  it("says so when no syndicate is offering", () => {
    render(<BountiesPanel bounties={[]} />);
    expect(screen.getByText("No bounties offered.")).toBeInTheDocument();
  });
});

describe("a bounty row", () => {
  it("reads as a level band, a mission type and the standing", () => {
    render(<BountiesPanel bounties={fixture} />);
    expect(screen.getByText("5 to 15")).toBeInTheDocument();
    expect(screen.getByText("Rescue")).toBeInTheDocument();
    expect(screen.getByText("1000 standing")).toBeInTheDocument();
  });

  it("keeps the rewards away until the row is opened", async () => {
    const user = userEvent.setup();
    render(<BountiesPanel bounties={fixture} />);
    expect(screen.queryByText("Nitain Extract, Cetus Wisp")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Rescue/ }));
    expect(screen.getByText("Nitain Extract, Cetus Wisp")).toBeInTheDocument();
  });

  it("opens one row at a time", async () => {
    const user = userEvent.setup();
    render(<BountiesPanel bounties={fixture} />);
    await user.click(screen.getByRole("button", { name: /Rescue/ }));
    await user.click(screen.getByRole("button", { name: /Assassination/ }));

    expect(screen.getByText("Gara Chassis")).toBeInTheDocument();
    expect(screen.queryByText("Nitain Extract, Cetus Wisp")).not.toBeInTheDocument();
  });

  it("calls a job with no mission type a bounty", () => {
    const board: Bounty[] = [
      {
        syndicate: "Entrati",
        node: "Necralisk (Deimos)",
        expiresAt: now + 3_600_000,
        jobs: [{ level: "30 - 40", minLevel: 30, maxLevel: 40, standing: 4000, rewards: ["Arcane"] }],
      },
    ];
    render(<BountiesPanel bounties={board} />);
    expect(screen.getByText("30 to 40")).toBeInTheDocument();
    expect(screen.getByText("Bounty")).toBeInTheDocument();
  });
});

describe("a board that lists the same level range twice", () => {
  it("renders both jobs rather than collapsing them into one", async () => {
    const user = userEvent.setup();
    const board: Bounty[] = [
      {
        syndicate: "Entrati",
        node: "Necralisk (Deimos)",
        expiresAt: now + 3_600_000,
        jobs: [
          { level: "30 - 40", minLevel: 30, maxLevel: 40, standing: 4000, missionType: "Excavation", rewards: ["Arcane"] },
          { level: "30 - 40", minLevel: 30, maxLevel: 40, standing: 5000, missionType: "Defense", rewards: ["Vault mod"] },
        ],
      },
    ];
    render(<BountiesPanel bounties={board} />);
    await pickBoard(user, /Deimos/);

    await user.click(screen.getByRole("button", { name: /Excavation/ }));
    expect(screen.getByText("Arcane")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Defense/ }));
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
      rotation: "C",
      jobs: [
        {
          level: "50 - 55",
          minLevel: 50,
          maxLevel: 55,
          standing: 0,
          missionType: "Void Flood",
          node: "Everview Arc (Zariman)",
          challenge: "Void Flood, complete waves",
          rewards: ["Aya", "Voidplume Down"],
          rewardTable: [
            { rotation: "A", rewards: [{ item: "Voidplume Down", chance: 13.04 }] },
            { rotation: "C", rewards: [{ item: "Aya", chance: 8.7 }] },
          ],
        },
      ],
    },
  ];

  it("reads like every other board, no fixed board label", () => {
    render(<BountiesPanel bounties={fixed} />);
    expect(screen.queryByText("fixed board")).not.toBeInTheDocument();
    expect(screen.getByText("The Holdfasts")).toBeInTheDocument();
  });

  it("names the mission the node runs instead of calling it a bounty", () => {
    render(<BountiesPanel bounties={fixed} />);
    expect(screen.getByText("Void Flood")).toBeInTheDocument();
    expect(screen.queryByText("Bounty")).not.toBeInTheDocument();
    expect(screen.getByText("Everview Arc (Zariman), Void Flood, complete waves")).toBeInTheDocument();
  });

  it("groups the rewards by rotation with their chances once the row is open", async () => {
    const user = userEvent.setup();
    render(<BountiesPanel bounties={fixed} />);
    await pickBoard(user, /Zariman/);
    expect(screen.queryByText(/Rotation A/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Void Flood/ }));
    expect(screen.getByText(/Rotation A/)).toBeInTheDocument();
    expect(screen.getByText("13.04%")).toBeInTheDocument();
    expect(screen.getByText("8.7%")).toBeInTheDocument();
  });

  it("puts the rotation the board is on right now first", async () => {
    const user = userEvent.setup();
    render(<BountiesPanel bounties={fixed} />);
    await user.click(screen.getByRole("button", { name: /Void Flood/ }));
    const headings = screen.getAllByText(/^Rotation [AC]/).map((el) => el.textContent);
    expect(headings).toEqual(["Rotation C, now", "Rotation A"]);
  });

  it("leaves standing out when the board does not print it", () => {
    render(<BountiesPanel bounties={fixed} />);
    expect(screen.queryByText(/0 standing/)).not.toBeInTheDocument();
    expect(screen.getByText("50 to 55")).toBeInTheDocument();
  });
});

describe("a hidden board", () => {
  const boards: Bounty[] = [
    { syndicate: "Ostron", node: "Cetus", expiresAt: now + 3_600_000, jobs: [] },
    { syndicate: "Vox Solaris", node: "Fortuna", expiresAt: now + 3_600_000, jobs: [] },
  ];

  it("leaves the toggle when the user turned it off", () => {
    render(
      <HiddenSet hidden={new Set(["board.vox"])}>
        <BountiesPanel bounties={boards} />
      </HiddenSet>,
    );
    expect(screen.queryByRole("radio", { name: "Vox" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Cetus" })).not.toBeInTheDocument();
    expect(screen.getByText("Ostron")).toBeInTheDocument();
  });

  it("still offers the boards that are left", () => {
    render(
      <HiddenSet hidden={new Set([])}>
        <BountiesPanel bounties={boards} />
      </HiddenSet>,
    );
    expect(screen.getByRole("radio", { name: "Vox" })).toBeInTheDocument();
  });
});
