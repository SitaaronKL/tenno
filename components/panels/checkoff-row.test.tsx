import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CheckoffRow } from "./checkoffs";

vi.mock("./checkoffs", async (importActual) => {
  const actual = await importActual<typeof import("./checkoffs")>();
  const toggle = vi.fn();
  return { ...actual, useCheckoffs: () => ({ done: new Set<string>(), toggle }) };
});

describe("check off row", () => {
  it("toggles once whether the row text or the box is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ul>
        <CheckoffRow id="k" expiresAt={Date.now() + 1000} label="Rescue, War">
          Rescue
        </CheckoffRow>
      </ul>,
    );
    const { useCheckoffs } = await import("./checkoffs");
    const { toggle } = useCheckoffs();
    await user.click(screen.getByText("Rescue"));
    expect(toggle).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("checkbox", { name: "Rescue, War" }));
    expect(toggle).toHaveBeenCalledTimes(2);
    expect(toggle).toHaveBeenLastCalledWith("k", expect.any(Number));
  });
});
