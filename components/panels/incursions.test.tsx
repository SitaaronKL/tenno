import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { Checkoffs } from "./checkoffs";
import { IncursionsPanel } from "./incursions";

const NODES = [
  "Tyana Pass (Mars)",
  "Hydron (Sedna)",
  "Cinxia (Ceres)",
  "Io (Jupiter)",
  "Sechura (Pluto)",
  "Xini (Eris)",
];

function Harness({ nodes = NODES }: { nodes?: string[] }) {
  const [done, setDone] = useState<ReadonlySet<string>>(new Set<string>());
  return (
    <Checkoffs
      canSave
      done={done}
      onToggle={(key) =>
        setDone((current) => {
          const next = new Set(current);
          if (!next.delete(key)) next.add(key);
          return next;
        })
      }
    >
      <IncursionsPanel incursions={nodes} />
    </Checkoffs>
  );
}

describe("Steel Path incursions", () => {
  it("lists the six nodes of the day with a check off each", () => {
    render(<Harness />);
    expect(screen.getByText("Incursions")).toBeInTheDocument();
    for (const node of NODES) expect(screen.getByText(node)).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(6);
  });

  it("counts done over total the way the sortie box does", async () => {
    render(<Harness />);
    expect(screen.getByText("0 / 6")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "Tyana Pass (Mars)" }));

    expect(screen.getByText("1 / 6")).toBeInTheDocument();
    expect(screen.getByText("Tyana Pass (Mars)").closest("li")).toHaveClass("line-through");
  });

  it("says so plainly when the schedule has run out", () => {
    render(<Harness nodes={[]} />);
    expect(screen.getByText(/schedule/i)).toBeInTheDocument();
  });
});
