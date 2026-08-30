import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { Checkoffs } from "./checkoffs";
import { MissionSetPanel } from "./missions";

const sortie = {
  key: "s1",
  boss: "Tyl Regor",
  faction: "Grineer",
  startsAt: 0,
  expiresAt: Date.now() + 3_600_000,
  missions: [
    { node: "War (Mars)", missionType: "Rescue", modifier: "Eximus Stronghold" },
    { node: "Ani (Void)", missionType: "Survival", modifier: "" },
    { node: "Hydron (Sedna)", missionType: "Defense", modifier: "" },
  ],
};

// The real provider talks to Convex, this stands in for it and keeps the ticks in state.
function Harness({ canSave }: { canSave: boolean }) {
  const [done, setDone] = useState<ReadonlySet<string>>(new Set<string>());
  return (
    <Checkoffs
      canSave={canSave}
      done={done}
      onToggle={(key) =>
        setDone((current) => {
          const next = new Set(current);
          if (!next.delete(key)) next.add(key);
          return next;
        })
      }
    >
      <MissionSetPanel sortie={sortie} archonHunt={null} />
    </Checkoffs>
  );
}

describe("check offs", () => {
  it("strikes a sortie stage through and counts down what is left", async () => {
    render(<Harness canSave />);
    expect(screen.getByText("3 of 3 left")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "Rescue, War (Mars)" }));

    expect(screen.getByText("War (Mars)").closest("li")).toHaveClass("line-through");
    expect(screen.getByText("2 of 3 left")).toBeInTheDocument();
  });

  it("asks a guest to sign in and leaves the box unticked", async () => {
    render(<Harness canSave={false} />);
    const box = screen.getByRole("checkbox", { name: "Rescue, War (Mars)" });

    await userEvent.click(box);

    expect(await screen.findByText("Sign in to save this")).toBeInTheDocument();
    expect(box).not.toBeChecked();
    expect(screen.getByText("3 of 3 left")).toBeInTheDocument();
  });
});
