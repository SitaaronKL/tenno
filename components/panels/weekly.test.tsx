import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import type { Circuit, DarvoDeal } from "@/lib/contracts/worldstate";
import { Checkoffs } from "./checkoffs";
import { WeeklyPanel } from "./weekly";

const circuit: Circuit = {
  normal: ["Nidus", "Octavia", "Harrow"],
  steelPath: ["Vectis", "Stug", "Ballistica"],
  expiresAt: Date.now() + 86_400_000,
};

const darvo: DarvoDeal = {
  item: "Akbronco",
  discount: 30,
  stock: 164,
  expiresAt: Date.now() + 3_600_000,
};

function Harness({ deal = darvo }: { deal?: DarvoDeal | null }) {
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
      <WeeklyPanel circuit={circuit} darvo={deal} />
    </Checkoffs>
  );
}

describe("weekly box", () => {
  it("names Teshin's offering, both Circuit rows and the Iron Wake trade", () => {
    render(<Harness />);
    expect(screen.getByText("Weekly")).toBeInTheDocument();
    expect(screen.getByText("Steel Path Honors")).toBeInTheDocument();
    expect(screen.getByText("Nidus, Octavia, Harrow")).toBeInTheDocument();
    expect(screen.getByText("Vectis, Stug, Ballistica")).toBeInTheDocument();
    expect(screen.getByText("Riven Sliver trade")).toBeInTheDocument();
  });

  it("shows Darvo's deal with the discount and what is left", () => {
    render(<Harness />);
    expect(screen.getByText(/Akbronco/)).toBeInTheDocument();
    expect(screen.getByText(/30% off, 164 left/)).toBeInTheDocument();
  });

  it("keeps the box readable on a day Darvo has nothing", () => {
    render(<Harness deal={null} />);
    expect(screen.queryByText(/Akbronco/)).not.toBeInTheDocument();
    expect(screen.getByText("Steel Path Honors")).toBeInTheDocument();
  });

  it("counts the four weekly tasks done over total, Darvo's daily deal is not one of them", async () => {
    render(<Harness />);
    expect(screen.getByText("0 / 4")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "Iron Wake, Riven Sliver trade" }));

    expect(screen.getByText("1 / 4")).toBeInTheDocument();
    expect(screen.getByText("Riven Sliver trade").closest("li")).toHaveClass("line-through");
  });
});
