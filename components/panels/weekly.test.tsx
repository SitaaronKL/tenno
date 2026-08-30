import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import type { Circuit } from "@/lib/contracts/worldstate";
import { PALLADINO_WARES } from "@/lib/palladino";
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

// Teshin, two Circuit pools, four single weekly missions, five Netracells and her wares.
const TOTAL = 3 + 4 + 5 + PALLADINO_WARES.length;

describe("weekly box", () => {
  it("names Teshin's offering, both Circuit rows and the Iron Wake trade", () => {
    render(<Harness />);
    expect(screen.getByText("Weekly")).toBeInTheDocument();
    expect(screen.getByText("Teshin's Steel Path Honors")).toBeInTheDocument();
    expect(screen.getByText("Nidus, Octavia, Harrow")).toBeInTheDocument();
    expect(screen.getByText("Vectis, Stug, Ballistica")).toBeInTheDocument();
    expect(screen.getByText("Palladino's Iron Wake")).toBeInTheDocument();
  });

  it("counts every weekly task done over total", async () => {
    render(<Harness />);
    expect(screen.getByText(`0 / ${TOTAL}`)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("checkbox", { name: /Teshin's Steel Path Honors/ }),
    );
    expect(screen.getByText(`1 / ${TOTAL}`)).toBeInTheDocument();
  });
});

describe("the weekly missions", () => {
  it("lists each one by the name the game uses", () => {
    render(<Harness />);
    for (const label of ["Descendia", "Netracells", "Kahl's Garrison", "Maroo's Ayatan hunt", "Clem's mission"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("ticks one off into the pill", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Kahl's Garrison/ }));

    expect(screen.getByText(`1 / ${TOTAL}`)).toBeInTheDocument();
    expect(screen.getByText("Kahl's Garrison").closest("li")).toHaveClass("line-through");
  });
});

describe("the Netracells row", () => {
  it("counts the five runs rather than asking for one tick", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByText("0 of 5 done")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Netracells, run 1 of 5" }));
    await user.click(screen.getByRole("checkbox", { name: "Netracells, run 3 of 5" }));

    expect(screen.getByText("2 of 5 done")).toBeInTheDocument();
    expect(screen.getByText(`2 / ${TOTAL}`)).toBeInTheDocument();
  });

  it("keeps each run on its own key, so a tick is not shared", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("checkbox", { name: "Netracells, run 1 of 5" }));

    expect(screen.getByRole("checkbox", { name: "Netracells, run 1 of 5" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Netracells, run 2 of 5" })).not.toBeChecked();
  });
});

describe("Palladino's Iron Wake row", () => {
  it("keeps her wares away until the row is opened", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByText("6,000 Endo")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Palladino's Iron Wake/ }));
    expect(screen.getByText("6,000 Endo")).toBeInTheDocument();
    expect(screen.getByText("150,000 Credits")).toBeInTheDocument();
    expect(screen.getAllByText("Riven Mod")).toHaveLength(2);
    expect(screen.getAllByText("10 slivers").length).toBeGreaterThan(0);
  });

  it("ticks one ware off on its own", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /Palladino's Iron Wake/ }));

    const endo = screen.getByRole("checkbox", { name: "6,000 Endo for 10 Riven Slivers" });
    await user.click(endo);

    expect(screen.getByText(`1 / ${TOTAL}`)).toBeInTheDocument();
    expect(screen.getByText("6,000 Endo").closest("li")).toHaveClass("line-through");
    expect(screen.getByText("150,000 Credits").closest("li")).not.toHaveClass("line-through");
  });
});
