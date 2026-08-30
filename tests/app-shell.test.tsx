import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

import { AppShell } from "@/components/shell/app-shell";

describe("app shell", () => {
  it("shows every section link and marks the current one", () => {
    render(<AppShell>page body</AppShell>);
    for (const label of ["Dashboard", "Rules", "Chat", "Settings"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("page body")).toBeInTheDocument();
  });

  it("has an account menu and a way to open navigation on mobile", () => {
    render(<AppShell>body</AppShell>);
    expect(screen.getByRole("button", { name: /account menu/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open navigation/i })).toBeInTheDocument();
  });
});
