import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const update = vi.fn().mockResolvedValue(null);
const profile = {
  email: "tenno@example.com",
  phone: "+15550001234",
  timezone: "UTC",
  digestHour: 9,
};

vi.mock("@/components/rules/api", () => ({
  useProfile: () => profile,
  useUpdateProfile: () => update,
}));

import SettingsPage from "@/app/(app)/settings/page";

describe("settings", () => {
  it("clearing the phone removes the saved number", async () => {
    const user = userEvent.setup();
    update.mockClear();
    render(<SettingsPage />);

    await user.clear(screen.getByLabelText("Phone"));
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(update).toHaveBeenCalledWith({ phone: null, timezone: "UTC", digestHour: 9 });
  });

  it("shows the email and the opt in instructions once a phone is saved", () => {
    render(<SettingsPage />);
    expect(screen.getByLabelText("Email")).toHaveValue("tenno@example.com");
    expect(screen.getByText("Text START to +1 (415) 603-5536 from this phone")).toBeInTheDocument();
    expect(screen.getByText("Waiting for your first text.")).toBeInTheDocument();
  });
});
