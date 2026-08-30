import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConvexError } from "convex/values";

// The page reads the line at module scope, so it has to be set before the import below.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_PHOTON_NUMBER = "+1 (415) 603-5536";
});

const update = vi.fn().mockResolvedValue(null);
// A zone the user has already chosen, so most tests do not trip the first load auto fill.
const profile = {
  email: "tenno@example.com",
  phone: "+15550001234",
  phoneVerified: false,
  timezone: "America/Los_Angeles",
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
  beforeEach(() => {
    profile.timezone = "America/Los_Angeles";
    profile.phone = "+15550001234";
    profile.phoneVerified = false;
    update.mockClear();
  });

  it("clearing the phone removes the saved number", async () => {
    const user = userEvent.setup();
    update.mockClear();
    renderPage();

    await user.clear(screen.getByLabelText("Phone"));
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(update).toHaveBeenCalledWith({ phone: null, timezone: "America/Los_Angeles", digestHour: 9 });
  });

  it("the danger zone removes the number in one click", async () => {
    const user = userEvent.setup();
    update.mockClear();
    renderPage();

    await user.click(screen.getByRole("button", { name: /remove phone/i }));

    expect(update).toHaveBeenCalledWith({ phone: null, timezone: "America/Los_Angeles", digestHour: 9 });
  });

  it("shows the email, the opt in instructions and the phone state", () => {
    renderPage();
    expect(screen.getByLabelText("Email")).toHaveValue("tenno@example.com");
    expect(screen.getByText(/Text START to \+1 \(415\) 603-5536 from this phone/)).toBeInTheDocument();
    expect(screen.getByText("Unverified")).toBeInTheDocument();
  });

  it("fills in the browser timezone and a nine local digest on the first load", async () => {
    profile.timezone = "UTC";
    renderPage();

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ timezone: "America/New_York", digestHour: 9 }),
    );
    expect(screen.getByLabelText("Timezone")).toHaveTextContent("America/New_York");
    expect(screen.getByLabelText("Digest hour")).toHaveTextContent("09:00");
  });

  it("does not touch a timezone the user already chose", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText("Timezone")).toHaveTextContent("America/Los_Angeles"));
    expect(update).not.toHaveBeenCalled();
  });

  it("shows the exact number to text once a phone is saved, and the live verified state", () => {
    profile.phoneVerified = true;
    renderPage();
    expect(screen.getByText(/Text START to \+1 \(415\) 603-5536 from this phone/)).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
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

describe("a save that is refused", () => {
  it("tells the user why instead of quietly reading Saved", async () => {
    const user = userEvent.setup();
    update.mockRejectedValueOnce(new ConvexError("That number is already linked to another account."));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Save settings" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "That number is already linked to another account.",
      ),
    );
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });
});

describe("when the deployment has no Photon line", () => {
  it("does not print an invented number to text", async () => {
    process.env.NEXT_PUBLIC_PHOTON_NUMBER = "";
    vi.resetModules();
    const { default: Page } = await import("@/app/(app)/settings/page");

    render(
      <ThemeProvider>
        <Page />
      </ThemeProvider>,
    );

    expect(await screen.findByLabelText("Phone")).toBeInTheDocument();
    expect(screen.queryByText(/Text START to/)).not.toBeInTheDocument();
    process.env.NEXT_PUBLIC_PHOTON_NUMBER = "+1 (415) 603-5536";
    vi.resetModules();
  });
});
