import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import type { Circuit } from "@/lib/contracts/worldstate";
import { Checkoffs } from "./checkoffs";
import { WeeklyPanel } from "./weekly";

const circuit: Circuit = {
  normal: ["Nidus", "Octavia", "Harrow"],
  steelPath: ["Vectis", "Stug", "Ballistica"],
  expiresAt: Date.now() + 86_400_000,
};

function Harness() {
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
      <WeeklyPanel circuit={circuit} />
    </Checkoffs>
  );
}

describe("weekly box", () => {
  it("names Teshin's offering, both Circuit rows and the Iron Wake trade", () => {
    render(<Harness />);
    expect(screen.getByText("Weekly")).toBeInTheDocument();
    expect(screen.getByText("Teshin's Steel Path Honors")).toBeInTheDocument();
    expect(screen.getByText("Nidus, Octavia, Harrow")).toBeInTheDocument();
    expect(screen.getByText("Vectis, Stug, Ballistica")).toBeInTheDocument();
    expect(screen.getByText("10 Riven Slivers for a veiled Riven")).toBeInTheDocument();
  });

  it("counts the four weekly tasks done over total", async () => {
    render(<Harness />);
    expect(screen.getByText("0 / 4")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "Palladino's Iron Wake, 10 Riven Slivers for a veiled Riven" }));

    expect(screen.getByText("1 / 4")).toBeInTheDocument();
    expect(screen.getByText("10 Riven Slivers for a veiled Riven").closest("li")).toHaveClass("line-through");
  });
});
