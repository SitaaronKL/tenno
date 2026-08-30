import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Fissure } from "@/lib/contracts/worldstate";
import { FissuresPanel } from "./fissures";

const now = Date.now();

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

// Deliberately out of order, and two Axi rows so the tie break is visible.
const fixture: Fissure[] = [
  fissure({ key: "a", tier: "Axi", node: "Xini, Eris", expiresAt: now + 7_200_000 }),
  fissure({ key: "b", tier: "Requiem", node: "Sechura, Venus" }),
  fissure({ key: "c", tier: "Lith", node: "Tessera, Venus", missionType: "Capture" }),
  fissure({ key: "d", tier: "Axi", node: "Io, Jupiter", expiresAt: now + 1_800_000 }),
  fissure({ key: "e", tier: "Meso", node: "Ur, Uranus", steelPath: true }),
]

function nodeOrder() {
  const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
  return rows.map((r) => r.textContent ?? "");
}

describe("Fissures table", () => {
  it("lists tiers in relic order and the soonest first inside a tier", () => {
    render(<FissuresPanel fissures={fixture} />);
    const order = nodeOrder();
    expect(order[0]).toContain("Tessera, Venus");
    expect(order[1]).toContain("Ur, Uranus");
    expect(order[2]).toContain("Io, Jupiter");
    expect(order[3]).toContain("Xini, Eris");
    expect(order[4]).toContain("Sechura, Venus");
  });

  it("reverses the tier order when the Tier header is clicked twice", async () => {
    const user = userEvent.setup();
    render(<FissuresPanel fissures={fixture} />);
    const header = screen.getByRole("button", { name: /Tier/ });
    await user.click(header);
    await user.click(header);
    expect(nodeOrder()[0]).toContain("Sechura, Venus");
  });

  it("says Steel Path in words, not as a chip a reader has to decode", () => {
    render(<FissuresPanel fissures={fixture} />);
    // The toggle also says Steel Path, so this asks the table, not the whole panel.
    const cells = screen.getAllByRole("cell").map((c) => c.textContent);
    expect(cells).toContain("Steel Path");
    expect(cells.filter((t) => t === "Normal")).toHaveLength(4);
  });

  it("narrows to Steel Path, and back", async () => {
    const user = userEvent.setup();
    render(<FissuresPanel fissures={fixture} />);
    const all = nodeOrder().length;

    await user.click(screen.getByRole("radio", { name: "Steel Path" }));
    const steel = nodeOrder().length;
    expect(steel).toBeGreaterThan(0);
    expect(steel).toBeLessThan(all);

    await user.click(screen.getByRole("radio", { name: "Normal" }));
    expect(nodeOrder().length).toBe(all - steel);

    await user.click(screen.getByRole("radio", { name: "All" }));
    expect(nodeOrder().length).toBe(all);
  });

  it("says so when nothing matches", () => {
    render(<FissuresPanel fissures={[]} />);
    expect(screen.getByText("No fissures open.")).toBeInTheDocument();
  });
});
