import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Archimedea } from "@/lib/contracts/worldstate";
import { ArchimedeaPanel } from "./archimedea";

const sets: Archimedea[] = [
  {
    key: "deep:1",
    variant: "deep",
    expiresAt: Date.now() + 86_400_000,
    missions: [
      { missionType: "Alchemy", deviation: "Hazardous Goods", risks: ["Hostile Regeneration"] },
      { missionType: "Survival", deviation: "Parasitic Towers", risks: ["Devil's Bargain"] },
    ],
    personalModifiers: ["Knifestep Syndrome", "Untreatable"],
    eliteBonus: ["Vampyric Liminus", "Entanglement"],
  },
  {
    key: "temporal:1",
    variant: "temporal",
    expiresAt: Date.now() + 86_400_000,
    missions: [{ missionType: "Extermination", deviation: "Cache Crash", risks: ["It's Alive"] }],
    personalModifiers: ["Gear Embargo"],
  },
];

describe("archimedea panel", () => {
  it("shows the deep set first and switches to temporal from the toggle", async () => {
    render(<ArchimedeaPanel archimedea={sets} />);
    expect(screen.getByText("Alchemy")).toBeInTheDocument();
    expect(screen.queryByText("Extermination")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Temporal" }));

    expect(screen.getByText("Extermination")).toBeInTheDocument();
    expect(screen.getByText("Cache Crash")).toBeInTheDocument();
    expect(screen.queryByText("Alchemy")).not.toBeInTheDocument();
  });

  it("adds the elite risks only once elite is on", async () => {
    render(<ArchimedeaPanel archimedea={sets} />);
    expect(screen.getByText("Hostile Regeneration")).toBeInTheDocument();
    expect(screen.queryByText(/Vampyric Liminus/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Elite" }));

    expect(screen.getByText("Hostile Regeneration, Vampyric Liminus")).toBeInTheDocument();
  });

  it("hides the elite toggle for a set with no elite form", async () => {
    render(<ArchimedeaPanel archimedea={sets} />);
    await userEvent.click(screen.getByRole("radio", { name: "Temporal" }));
    expect(screen.queryByRole("radio", { name: "Elite" })).not.toBeInTheDocument();
  });

  it("lists the personal modifiers of the set on show", () => {
    render(<ArchimedeaPanel archimedea={sets} />);
    expect(screen.getByText("Knifestep Syndrome, Untreatable")).toBeInTheDocument();
  });

  it("says nothing is running when the week carries no set", () => {
    render(<ArchimedeaPanel archimedea={[]} />);
    expect(screen.getByText("Nothing active.")).toBeInTheDocument();
  });
});
