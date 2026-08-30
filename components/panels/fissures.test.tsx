import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Fissure } from "@/lib/contracts/worldstate";
import { FissuresPanel } from "./fissures";

const now = 1_700_000_000_000;

function fissure(over: Partial<Fissure> & { key: string }): Fissure {
  return {
    node: "Node",
    missionType: "Survival",
    enemy: "Grineer",
    tier: "Axi",
    steelPath: false,
    storm: false,
    startsAt: now,
    expiresAt: now + 3_600_000,
    ...over,
  };
}

const fixture: Fissure[] = [
  fissure({ key: "a", tier: "Lith", missionType: "Capture", node: "Tessera, Venus" }),
  fissure({ key: "b", tier: "Axi", missionType: "Defense", node: "Xini, Eris" }),
  fissure({ key: "c", tier: "Meso", missionType: "Exterminate", node: "Io, Jupiter", steelPath: true }),
];

describe("Fissures panel", () => {
  it("lists the normal fissures with their tier and node", () => {
    render(<FissuresPanel fissures={fixture} />);
    const rows = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(rows.some((t) => t?.includes("Lith") && t.includes("Capture"))).toBe(true);
    expect(rows.some((t) => t?.includes("Axi") && t.includes("Defense"))).toBe(true);
    expect(screen.getByText("Capture")).toBeInTheDocument();
    expect(screen.getByText("Defense")).toBeInTheDocument();
    expect(screen.getByText(/Tessera, Venus/)).toBeInTheDocument();
    expect(screen.queryByText(/Io, Jupiter/)).not.toBeInTheDocument();
  });

  it("shows Steel Path fissures once the toggle is on", async () => {
    const user = userEvent.setup();
    render(<FissuresPanel fissures={fixture} />);
    await user.click(screen.getByRole("switch"));
    expect(screen.getByText(/Io, Jupiter/)).toBeInTheDocument();
    expect(screen.queryByText(/Tessera, Venus/)).not.toBeInTheDocument();
  });

  it("filters to one tier when its tab is picked", async () => {
    const user = userEvent.setup();
    render(<FissuresPanel fissures={fixture} />);
    await user.click(screen.getByRole("tab", { name: "Lith" }));
    expect(screen.getByText(/Tessera, Venus/)).toBeInTheDocument();
    expect(screen.queryByText(/Xini, Eris/)).not.toBeInTheDocument();
  });

  it("says so when nothing matches", () => {
    render(<FissuresPanel fissures={[]} />);
    expect(screen.getByText("No fissures open.")).toBeInTheDocument();
  });
});
