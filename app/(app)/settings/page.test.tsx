import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const update = vi.fn().mockResolvedValue(null);
const profile = {
  email: "tenno@example.com",
  phone: "+15550001234",
  phoneVerified: false,
  timezone: "UTC",
  digestHour: 9,
};

vi.mock("@/components/rules/api", () => ({
  useProfile: () => profile,
  useUpdateProfile: () => update,
}));
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { ThemeProvider } from "@/components/shell/theme-provider";
import SettingsPage from "@/app/(app)/settings/page";

function renderPage() {
  return render(
    <ThemeProvider>
      <SettingsPage />
    </ThemeProvider>,
  );
}

describe("settings", () => {
  it("clearing the phone removes the saved number", async () => {
    const user = userEvent.setup();
    update.mockClear();
    renderPage();

    await user.clear(screen.getByLabelText("Phone"));
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(update).toHaveBeenCalledWith({ phone: null, timezone: "UTC", digestHour: 9 });
  });

  it("the danger zone removes the number in one click", async () => {
    const user = userEvent.setup();
    update.mockClear();
    renderPage();

    await user.click(screen.getByRole("button", { name: /remove phone/i }));

    expect(update).toHaveBeenCalledWith({ phone: null, timezone: "UTC", digestHour: 9 });
  });

  it("shows the email, the opt in instructions and the phone state", () => {
    renderPage();
    expect(screen.getByLabelText("Email")).toHaveValue("tenno@example.com");
    expect(screen.getByText(/Text START to \+1 \(415\) 603-5536 from this phone/)).toBeInTheDocument();
    expect(screen.getByText("Unverified")).toBeInTheDocument();
  });

  it("keeps the dark theme after the page is rebuilt", async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage();

    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(document.documentElement).toHaveClass("dark");

    unmount();
    renderPage();

    expect(document.documentElement).toHaveClass("dark");
    expect(await screen.findByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
  });
});
