import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const create = vi.fn().mockResolvedValue("rule-1");

vi.mock("@/components/rules/api", () => ({
  useCreateRule: () => create,
  useDraftRule: () => vi.fn(),
  useProfile: () => ({
    email: "tenno@example.com",
    phone: null,
    phoneVerified: false,
    timezone: "UTC",
    digestHour: 9,
  }),
}));

import { RuleSuggestions, SUGGESTIONS } from "@/components/rules/suggestions";

describe("rule suggestions", () => {
  it("offers every suggestion as a chip a player can read", () => {
    render(<RuleSuggestions />);
    expect(screen.getByRole("heading", { name: "Suggestions" })).toBeInTheDocument();
    for (const suggestion of SUGGESTIONS) {
      expect(screen.getByRole("button", { name: suggestion.label })).toBeInTheDocument();
    }
  });

  it("opens the dialog prefilled with the bounty rule", async () => {
    const user = userEvent.setup();
    render(<RuleSuggestions />);

    await user.click(screen.getByRole("button", { name: "Tier 5 bounty is Exterminate" }));

    expect(
      await screen.findByText("Tier 5 bounty from The Holdfasts, The Hex or Cavia, Exterminate"),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText("Name")).toHaveValue("Tier 5 bounty is Exterminate");
  });

  it("opens the dialog prefilled with the lead time on a cycle rule", async () => {
    const user = userEvent.setup();
    render(<RuleSuggestions />);

    await user.click(screen.getByRole("button", { name: "10 minutes before Cetus night" }));

    expect(await screen.findByText("10 minutes before Cetus turns night")).toBeInTheDocument();
  });

  it("saves the suggestion the user confirms, on the profile's channels", async () => {
    const user = userEvent.setup();
    render(<RuleSuggestions />);

    await user.click(screen.getByRole("button", { name: "Weekly reset" }));
    await user.click(await screen.findByRole("button", { name: "Create rule" }));

    expect(create).toHaveBeenCalledWith({
      name: "Weekly reset",
      filter: { kind: "reset", period: "weekly" },
      mode: "instant",
      channels: ["email"],
    });
  });
});
