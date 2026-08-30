import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Id } from "@/convex/_generated/dataModel";
import { GoalsTable, type GoalRow } from "./goals-table";

function goal(over: Partial<GoalRow> = {}): GoalRow {
  return {
    _id: "g1" as Id<"goals">,
    itemName: "Orokin Cell",
    wantedCount: 10,
    haveCount: 4,
    createdAt: 0,
    sources: [
      { place: "Corrupted Vor", rotation: "", chance: 50 },
      { place: "Level 40 - 60 Orb Vallis Bounty", rotation: "A", chance: 33.33 },
      { place: "Formido (Caches) (Deimos), Caches", rotation: "C", chance: 19.36 },
      { place: "Marduk (Void), Survival", rotation: "B", chance: 5 },
    ],
    live: [],
    ...over,
  };
}

describe("GoalsTable", () => {
  it("prints the three best farms in the row", () => {
    render(<GoalsTable rows={[goal()]} onSetHave={() => {}} onRemove={() => {}} />);

    expect(screen.getByText("Corrupted Vor")).toBeInTheDocument();
    expect(screen.getByText("Level 40 - 60 Orb Vallis Bounty")).toBeInTheDocument();
    expect(screen.queryByText("Marduk (Void), Survival")).not.toBeInTheDocument();
  });

  it("shows a live badge and a farm rule when an invasion is offering the item", () => {
    const live = [{ kind: "invasion" as const, label: "Invasion, Tessera (Venus)" }];
    render(<GoalsTable rows={[goal({ live })]} onSetHave={() => {}} onRemove={() => {}} />);

    expect(screen.getByText("Live now, Invasion, Tessera (Venus)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Farm this" })).toBeInTheDocument();
  });

  it("offers no rule when nothing live can name the item", () => {
    render(<GoalsTable rows={[goal()]} onSetHave={() => {}} onRemove={() => {}} />);

    expect(screen.queryByRole("button", { name: "Farm this" })).not.toBeInTheDocument();
  });

  it("saves an edited have count when the field loses focus", async () => {
    const user = userEvent.setup();
    const onSetHave = vi.fn();
    render(<GoalsTable rows={[goal()]} onSetHave={onSetHave} onRemove={() => {}} />);

    const field = screen.getByLabelText("Have of Orokin Cell");
    await user.clear(field);
    await user.type(field, "7");
    await user.tab();

    expect(onSetHave).toHaveBeenCalledWith(expect.objectContaining({ itemName: "Orokin Cell" }), 7);
  });

  it("reads progress out for a screen reader", () => {
    render(<GoalsTable rows={[goal()]} onSetHave={() => {}} onRemove={() => {}} />);

    expect(screen.getByRole("progressbar", { name: "Orokin Cell progress" })).toHaveAttribute(
      "aria-valuenow",
      "40",
    );
  });
});
