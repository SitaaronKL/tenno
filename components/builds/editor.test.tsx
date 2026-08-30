import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BuildEditor, newDraft } from "./editor";
import type { ModDef } from "@/lib/builds/capacity";
import type { BuildItem } from "./types";

const items: BuildItem[] = [
  {
    uniqueName: "rhino",
    name: "Rhino",
    kind: "warframe",
    stats: { health: 270, shield: 455, armor: 240, energy: 100, sprint: 0.95 },
  },
];

const mods: ModDef[] = [
  {
    uniqueName: "vitality",
    name: "Vitality",
    kind: "mod",
    polarity: "vazarin",
    slot: "mod",
    baseDrain: 2,
    fusionLimit: 10,
    effects: [{ stat: "health", percent: 100 }],
  },
  {
    uniqueName: "corrosiveProjection",
    name: "Corrosive Projection",
    kind: "mod",
    polarity: "naramon",
    slot: "aura",
    baseDrain: -2,
    fusionLimit: 5,
    effects: [],
  },
];

function draft() {
  return { ...newDraft("rhino"), name: "Tanky Rhino" };
}

describe("BuildEditor", () => {
  it("spends capacity when a mod goes into a slot", async () => {
    const user = userEvent.setup();
    render(<BuildEditor initial={draft()} items={items} mods={mods} />);

    expect(screen.getByText("0/30")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Slot 1 slot" }));
    await user.click(await screen.findByRole("button", { name: /Vitality/ }));

    // A maxed Vitality is 12 capacity, and the frame now has 18 left.
    expect(screen.getByText("12/30")).toBeInTheDocument();
    expect(screen.getByText("18 left")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Slot 1 slot" })).toHaveTextContent("Vitality");
  });

  it("shows the mod in the stat preview", async () => {
    const user = userEvent.setup();
    render(<BuildEditor initial={draft()} items={items} mods={mods} />);

    expect(screen.getByText("270")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Slot 1 slot" }));
    await user.click(await screen.findByRole("button", { name: /Vitality/ }));

    expect(screen.getByText("540")).toBeInTheDocument();
  });

  it("warns when the mods cost more than the frame has", async () => {
    const user = userEvent.setup();
    render(<BuildEditor initial={draft()} items={items} mods={mods} />);

    for (const slot of ["Slot 1", "Slot 2", "Slot 3"]) {
      await user.click(screen.getByRole("button", { name: `${slot} slot` }));
      await user.click(await screen.findByRole("button", { name: /Vitality/ }));
    }

    expect(screen.getByRole("alert")).toHaveTextContent("Over capacity by 6");
  });

  it("an aura raises the pool instead of spending it", async () => {
    const user = userEvent.setup();
    render(<BuildEditor initial={draft()} items={items} mods={mods} />);

    await user.click(screen.getByRole("button", { name: "Aura slot" }));
    await user.click(await screen.findByRole("button", { name: /Corrosive Projection/ }));

    expect(screen.getByText("0/37")).toBeInTheDocument();
  });

  it("hands the whole build back on save", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<BuildEditor initial={draft()} items={items} mods={mods} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: "Slot 1 slot" }));
    await user.click(await screen.findByRole("button", { name: /Vitality/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];
    expect(saved.itemId).toBe("rhino");
    expect(saved.slots.mods[0]).toEqual({ uniqueName: "vitality", rank: 10 });
  });
});
