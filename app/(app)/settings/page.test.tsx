import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
  hidden: [] as string[],
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
    profile.hidden = [];
    update.mockClear();
  });

  it("puts the save button in the page header", () => {
    renderPage();
    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("button", { name: "Save settings" })).toBeInTheDocument();
  });

  it("save is greyed out until something changes", async () => {
    const user = userEvent.setup();
    renderPage();
    const save = within(screen.getByRole("banner")).getByRole("button", { name: "Save settings" });

    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText("Phone"), "9");
    expect(save).toBeEnabled();
  });

  it("typing a new number asks to save it in the box underneath", async () => {
    const user = userEvent.setup();
    renderPage();

    const phone = screen.getByLabelText("Phone");
    await user.clear(phone);
    await user.type(phone, "+15550009999");

    const box = screen.getByText("Save settings to confirm this number.").closest("div")!;
    expect(within(box).getByRole("button", { name: "Save settings" })).toBeInTheDocument();
    expect(screen.queryByText(/Text START to/)).not.toBeInTheDocument();
  });

  it("clearing the phone removes the saved number", async () => {
    const user = userEvent.setup();
    update.mockClear();
    renderPage();

    await user.clear(screen.getByLabelText("Phone"));
    await user.click(
      within(screen.getByRole("banner")).getByRole("button", { name: "Save settings" }),
    );

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
    // The runner's clock is UTC, the test needs a browser that reports a real zone.
    const resolved = vi
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockReturnValue({ timeZone: "America/New_York" } as Intl.ResolvedDateTimeFormatOptions);
    profile.timezone = "UTC";
    renderPage();

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ timezone: "America/New_York", digestHour: 9 }),
    );
    expect(screen.getByLabelText("Timezone")).toHaveTextContent("America/New_York");
    expect(screen.getByLabelText("Digest hour")).toHaveTextContent("09:00");
    resolved.mockRestore();
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

    // An untouched form cannot be saved, so the refusal needs a change first.
    await user.type(screen.getByLabelText("Phone"), "9");
    await user.click(
      within(screen.getByRole("banner")).getByRole("button", { name: "Save settings" }),
    );

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

describe("the world state card", () => {
  beforeEach(() => {
    profile.hidden = [];
    update.mockClear();
  });

  it("groups the switches by boxes, boards and tiles", () => {
    renderPage();
    expect(screen.getByRole("group", { name: "Boxes" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Bounty boards" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Tiles" })).toBeInTheDocument();
  });

  it("shows everything until the user says otherwise", () => {
    renderPage();
    const boxes = within(screen.getByRole("group", { name: "Boxes" }));
    expect(boxes.getByRole("switch", { name: "Nightwave" })).toBeChecked();
  });

  it("saves the key the moment a switch goes off", async () => {
    const user = userEvent.setup();
    renderPage();
    const boards = within(screen.getByRole("group", { name: "Bounty boards" }));

    await user.click(boards.getByRole("switch", { name: "Vox" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ hidden: ["board.vox"] }));
  });

  it("reads a saved choice back as an off switch", () => {
    profile.hidden = ["tile.baro"];
    renderPage();
    const tiles = within(screen.getByRole("group", { name: "Tiles" }));
    expect(tiles.getByRole("switch", { name: "Baro" })).not.toBeChecked();
    const boxes = within(screen.getByRole("group", { name: "Boxes" }));
    expect(boxes.getByRole("switch", { name: "Baro" })).toBeChecked();
  });

  it("saves the default fissure view as one preference", async () => {
    const user = userEvent.setup();
    renderPage();
    const fissures = within(screen.getByRole("group", { name: "Fissures" }));

    await user.click(fissures.getByRole("radio", { name: "Steel Path" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ hidden: ["pref.fissures.steel"] }));
  });

  it("picking a new default view replaces the old one", async () => {
    const user = userEvent.setup();
    profile.hidden = ["pref.fissures.steel"];
    renderPage();
    const fissures = within(screen.getByRole("group", { name: "Fissures" }));

    await user.click(fissures.getByRole("radio", { name: "Void Storm" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ hidden: ["pref.fissures.storm"] }));
  });

  it("saves the tier order preference", async () => {
    const user = userEvent.setup();
    renderPage();
    const fissures = within(screen.getByRole("group", { name: "Fissures" }));

    await user.click(fissures.getByRole("radio", { name: "Lowest first" }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ hidden: ["pref.fissures.lithFirst"] }),
    );
  });

  it("puts a key back when the switch goes on again", async () => {
    const user = userEvent.setup();
    profile.hidden = ["box.nightwave"];
    renderPage();
    const boxes = within(screen.getByRole("group", { name: "Boxes" }));

    await user.click(boxes.getByRole("switch", { name: "Nightwave" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ hidden: [] }));
  });
});
