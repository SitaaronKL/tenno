import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const create = vi.fn().mockResolvedValue("rule-1");
const push = vi.fn();

vi.mock("@/components/rules/api", () => ({
  useCreateRule: () => create,
  useProfile: () => ({
    email: "tenno@example.com",
    phone: null,
    phoneVerified: false,
    timezone: "UTC",
    digestHour: 9,
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { CreateRuleDialog } from "@/components/rules/create-rule-dialog";

describe("the new rule dialog", () => {
  it("opens on describing, with a way to build manually underneath", async () => {
    const user = userEvent.setup();
    render(<CreateRuleDialog />);
    await user.click(screen.getByRole("button", { name: "New rule" }));

    expect(await screen.findByLabelText("Describe the rule")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I want to build it manually" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("describing continues in the agent chat with the words carried over", async () => {
    const user = userEvent.setup();
    render(<CreateRuleDialog />);
    await user.click(screen.getByRole("button", { name: "New rule" }));

    await user.type(
      await screen.findByLabelText("Describe the rule"),
      "omnia void cascade on steel path",
    );
    await user.click(screen.getByRole("button", { name: "Ask your Cephalon" }));

    expect(push).toHaveBeenCalledWith("/chat?describe=omnia%20void%20cascade%20on%20steel%20path");
  });

  it("the manual path shows the rule form", async () => {
    const user = userEvent.setup();
    render(<CreateRuleDialog />);
    await user.click(screen.getByRole("button", { name: "New rule" }));
    await user.click(await screen.findByRole("button", { name: "I want to build it manually" }));

    expect(await screen.findByLabelText("Name")).toBeInTheDocument();
  });
});
