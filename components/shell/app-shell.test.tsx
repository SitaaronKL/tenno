import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));
// The shell reads the signed in user, the shape of the chrome is what this test is about.
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
  useQuery: () => undefined,
}));

import { AppShell } from "@/components/shell/app-shell";

function sidebar() {
  return document.querySelector('[data-slot="sidebar"]') as HTMLElement;
}

describe("app shell", () => {
  it("shows every section link and marks the current one", () => {
    render(<AppShell>page body</AppShell>);
    const nav = within(sidebar());
    for (const label of ["Dashboard", "Rules", "Chat", "Settings"]) {
      expect(nav.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("page body")).toBeInTheDocument();
  });

  it("puts the account card and a breadcrumb for the route in the chrome", () => {
    render(<AppShell>body</AppShell>);
    expect(screen.getByRole("button", { name: /account menu/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toHaveTextContent("Dashboard");
  });

  it("collapses the sidebar on cmd+b and opens it again", async () => {
    const user = userEvent.setup();
    render(<AppShell>body</AppShell>);
    expect(sidebar()).toHaveAttribute("data-state", "expanded");

    await user.keyboard("{Meta>}b{/Meta}");
    expect(sidebar()).toHaveAttribute("data-state", "collapsed");

    await user.keyboard("{Meta>}b{/Meta}");
    expect(sidebar()).toHaveAttribute("data-state", "expanded");
  });

  it("collapses the sidebar when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<AppShell>body</AppShell>);
    // The rail carries the same label, the header trigger is the first one.
    await user.click(screen.getAllByRole("button", { name: /toggle sidebar/i })[0]);
    expect(sidebar()).toHaveAttribute("data-state", "collapsed");
  });
});
