import { describe, expect, it, vi } from "vitest";
import { forwardRef, useImperativeHandle } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnimatedIconHandle } from "./nav";

const { started, stopped } = vi.hoisted(() => ({ started: vi.fn(), stopped: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@convex-dev/auth/react", () => ({ useAuthActions: () => ({ signOut: vi.fn() }) }));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
  useQuery: () => undefined,
}));
vi.mock("./nav", async () => {
  const actual = await vi.importActual<typeof import("./nav")>("./nav");
  // The factory is hoisted, so the probe is built here rather than referenced from above.
  const Probe = forwardRef<AnimatedIconHandle, { size?: number }>((_props, ref) => {
    useImperativeHandle(ref, () => ({ startAnimation: started, stopAnimation: stopped }));
    return <svg data-testid="probe-icon" />;
  });
  Probe.displayName = "Probe";
  return { ...actual, NAV_ITEMS: [{ href: "/rules", label: "Rules", icon: Probe }] };
});

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

describe("sidebar icons", () => {
  it("runs the icon animation when the whole nav row is hovered", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>,
    );
    const row = screen.getByRole("link", { name: "Rules" });

    await user.hover(row);
    expect(started).toHaveBeenCalled();

    await user.unhover(row);
    expect(stopped).toHaveBeenCalled();
  });
});
