import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RuleInput } from "@/lib/contracts/rule";

const create = vi.fn().mockResolvedValue("rule-1");

vi.mock("@/components/rules/api", () => ({
  useCreateRule: () => create,
  useDraftRule: () => vi.fn(),
}));

import { CreateRuleDialog } from "@/components/rules/create-rule-dialog";

describe("create rule", () => {
  beforeEach(() => create.mockClear());

  it("leaves Steel Path unconstrained unless the user picks a side", async () => {
    const user = userEvent.setup();
    render(<CreateRuleDialog />);

    await user.click(screen.getByRole("button", { name: "New rule" }));
    await user.type(await screen.findByLabelText("Name"), "Any Axi");
    await user.click(screen.getByRole("button", { name: "Create rule" }));

    expect(create.mock.calls[0][0].filter.steelPath).toBe(null);
  });

  it("can ask for Steel Path only", async () => {
    const user = userEvent.setup();
    render(<CreateRuleDialog />);

    await user.click(screen.getByRole("button", { name: "New rule" }));
    await user.type(await screen.findByLabelText("Name"), "Steel only");
    await user.selectOptions(await screen.findByLabelText("Steel Path"), "only");
    await user.click(screen.getByRole("button", { name: "Create rule" }));

    expect(create.mock.calls[0][0].filter.steelPath).toBe(true);
  });

  it("can ask for everything but Steel Path", async () => {
    const user = userEvent.setup();
    render(<CreateRuleDialog />);

    await user.click(screen.getByRole("button", { name: "New rule" }));
    await user.type(await screen.findByLabelText("Name"), "No steel");
    await user.selectOptions(await screen.findByLabelText("Steel Path"), "exclude");
    await user.click(screen.getByRole("button", { name: "Create rule" }));

    expect(create.mock.calls[0][0].filter.steelPath).toBe(false);
  });

  it("shows the tier picker for fissures and saves a valid rule", async () => {
    const user = userEvent.setup();
    render(<CreateRuleDialog />);

    await user.click(screen.getByRole("button", { name: "New rule" }));

    const kind = await screen.findByLabelText("Event kind");
    await user.selectOptions(kind, "invasion");
    expect(screen.queryByRole("checkbox", { name: "Axi" })).not.toBeInTheDocument();

    await user.selectOptions(kind, "fissure");
    await user.click(screen.getByRole("checkbox", { name: "Axi" }));
    await user.click(screen.getByRole("checkbox", { name: "Survival" }));
    await user.type(screen.getByLabelText("Name"), "Axi survival");
    await user.click(screen.getByRole("radio", { name: "Hourly digest" }));
    await user.click(screen.getByRole("button", { name: "Create rule" }));

    expect(create).toHaveBeenCalledTimes(1);
    const input = create.mock.calls[0][0];
    expect(RuleInput.parse(input)).toMatchObject({
      name: "Axi survival",
      mode: "digest",
      channels: ["email"],
      filter: { kind: "fissure", tiers: ["Axi"], missionTypes: ["Survival"] },
    });
  });
});
