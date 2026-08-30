import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MasteryTable } from "./mastery-table";
import type { MasteryRow } from "./types";

const rows: MasteryRow[] = [
  { uniqueName: "a", name: "Braton", kind: "primary", masteryReq: 0, masteryXp: 3000, mastered: true },
  { uniqueName: "b", name: "Braton Prime", kind: "primary", masteryReq: 8, masteryXp: 3000, mastered: false },
  { uniqueName: "c", name: "Excalibur", kind: "warframe", masteryReq: 0, masteryXp: 6000, mastered: true },
];

describe("MasteryTable", () => {
  it("hides Primes when the reader asks for it", async () => {
    const user = userEvent.setup();
    render(<MasteryTable rows={rows} />);

    expect(screen.getByText("Braton Prime")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Hide Primes" }));

    expect(screen.queryByText("Braton Prime")).not.toBeInTheDocument();
    expect(screen.getByText("Braton")).toBeInTheDocument();
    expect(screen.getByText("Excalibur")).toBeInTheDocument();
  });

  it("shows only Primes on the other setting", async () => {
    const user = userEvent.setup();
    render(<MasteryTable rows={rows} />);

    await user.click(screen.getByRole("radio", { name: "Prime only" }));

    expect(screen.getByText("Braton Prime")).toBeInTheDocument();
    expect(screen.queryByText("Excalibur")).not.toBeInTheDocument();
  });
});
