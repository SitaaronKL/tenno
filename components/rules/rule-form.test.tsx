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
import { RuleForm } from "@/components/rules/rule-form";

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "New rule" }));
  return await screen.findByLabelText("Name");
}

describe("create rule", () => {
  beforeEach(() => create.mockClear());

  it("leaves Steel Path unconstrained unless the user picks a side", async () => {
    const user = userEvent.setup();
    render(<CreateRuleDialog />);

    await user.type(await openDialog(user), "Any Axi");
    await user.click(screen.getByRole("button", { name: "Create rule" }));

    expect(create.mock.calls[0][0].filter.steelPath).toBe(null);
  });

  it("can ask for Steel Path only", async () => {
    const user = userEvent.setup();
    render(<CreateRuleDialog />);

    await user.type(await openDialog(user), "Steel only");
    await user.click(screen.getByRole("radio", { name: "Only" }));
    await user.click(screen.getByRole("button", { name: "Create rule" }));

    expect(create.mock.calls[0][0].filter.steelPath).toBe(true);
  });

  it("can ask for everything but Steel Path", async () => {
    const user = userEvent.setup();
    render(<CreateRuleDialog />);

    await user.type(await openDialog(user), "No steel");
    await user.click(screen.getByRole("radio", { name: "Exclude" }));
    await user.click(screen.getByRole("button", { name: "Create rule" }));

    expect(create.mock.calls[0][0].filter.steelPath).toBe(false);
  });

  it("drops the tier picker when the rule is not about fissures", async () => {
    const user = userEvent.setup();
    render(<CreateRuleDialog />);
    await openDialog(user);

    expect(screen.getByRole("button", { name: /Relic tiers/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Event kind/ }));
    await user.click(await screen.findByRole("radio", { name: "Invasion" }));

    expect(screen.queryByRole("button", { name: /Relic tiers/ })).not.toBeInTheDocument();
  });

  it("shows the tier picker for fissures and saves a valid rule", async () => {
    const user = userEvent.setup();
    render(<CreateRuleDialog />);
    await user.type(await openDialog(user), "Axi survival");

    await user.click(screen.getByRole("button", { name: /Relic tiers/ }));
    await user.click(await screen.findByRole("checkbox", { name: "Axi" }));
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: /Mission types/ }));
    await user.click(await screen.findByRole("checkbox", { name: "Survival" }));
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: /Delivery/ }));
    await user.click(await screen.findByRole("radio", { name: "Hourly digest" }));
    await user.keyboard("{Escape}");

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

describe("Void Storm, the one filter the form used to drop", () => {
  beforeEach(() => create.mockClear());

  it("leaves Void Storm unconstrained unless the user picks a side", async () => {
    const user = userEvent.setup();
    render(<CreateRuleDialog />);

    await user.type(await openDialog(user), "Any Axi");
    await user.click(screen.getByRole("button", { name: "Create rule" }));

    expect(create.mock.calls[0][0].filter.storm).toBe(null);
  });

  it("saves a Void Storm only rule the way the user set it", async () => {
    const user = userEvent.setup();
    render(<CreateRuleDialog />);

    await user.type(await openDialog(user), "Storms only");
    await user.click(screen.getByRole("radio", { name: "Only Void Storm" }));
    await user.click(screen.getByRole("button", { name: "Create rule" }));

    expect(create.mock.calls[0][0].filter.storm).toBe(true);
    expect(RuleInput.safeParse(create.mock.calls[0][0]).success).toBe(true);
  });

  it("keeps a drafted Void Storm rule when it is edited and saved unchanged", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <RuleForm
        initial={{
          name: "Storms",
          filter: { kind: "fissure", tiers: null, missionTypes: null, steelPath: null, storm: true },
          mode: "instant",
          channels: ["email"],
        }}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save rule" }));

    expect(onSubmit.mock.calls[0][0].filter.storm).toBe(true);
  });
});
