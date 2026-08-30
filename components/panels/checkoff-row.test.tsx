import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CheckoffRow, Checkoffs } from "./checkoffs";

describe("check off row", () => {
  it("toggles once whether the row text or the box is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <Checkoffs canSave done={new Set()} onToggle={onToggle}>
        <ul>
          <CheckoffRow id="k" expiresAt={Date.now() + 1000} label="Rescue, War">
            Rescue
          </CheckoffRow>
        </ul>
      </Checkoffs>,
    );
    await user.click(screen.getByText("Rescue"));
    expect(onToggle).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("checkbox", { name: "Rescue, War" }));
    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(onToggle).toHaveBeenLastCalledWith("k", expect.any(Number));
  });

  it("asks a guest to sign in instead of toggling", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <Checkoffs canSave={false} done={new Set()} onToggle={onToggle}>
        <ul>
          <CheckoffRow id="k" expiresAt={Date.now() + 1000} label="Rescue, War">
            Rescue
          </CheckoffRow>
        </ul>
      </Checkoffs>,
    );
    await user.click(screen.getByText("Rescue"));
    expect(onToggle).not.toHaveBeenCalled();
    expect(await screen.findByText("Sign in to save this")).toBeInTheDocument();
  });
});
