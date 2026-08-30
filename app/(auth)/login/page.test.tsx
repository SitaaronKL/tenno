import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signIn = vi.fn(async () => ({ signingIn: true }));
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn, signOut: vi.fn() }),
}));

import LoginPage from "@/app/(auth)/login/page";

describe("login page", () => {
  beforeEach(() => {
    signIn.mockClear();
    vi.stubEnv("NEXT_PUBLIC_AUTH_DISCORD", "true");
    vi.stubEnv("NEXT_PUBLIC_AUTH_RESEND", "true");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("hides a sign in route the deployment has not configured", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_DISCORD", "");
    render(<LoginPage />);
    expect(screen.queryByRole("button", { name: /continue with discord/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("offers the guest way in only where it is switched on", () => {
    const { unmount } = render(<LoginPage />);
    expect(screen.queryByRole("button", { name: /continue as guest/i })).not.toBeInTheDocument();
    unmount();

    vi.stubEnv("NEXT_PUBLIC_ALLOW_GUEST", "true");
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /continue as guest/i })).toBeInTheDocument();
  });

  it("offers Discord sign in and an email form", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /continue with discord/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /magic link/i })).toBeInTheDocument();
  });

  it("confirms the link was sent after submitting an email", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), "tenno@example.com");
    await user.click(screen.getByRole("button", { name: /magic link/i }));
    expect(signIn).toHaveBeenCalledWith("resend", {
      email: "tenno@example.com",
      redirectTo: "/dashboard",
    });
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText(/tenno@example.com/)).toBeInTheDocument();
  });
});
