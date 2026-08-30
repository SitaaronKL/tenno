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
    vi.stubEnv("NEXT_PUBLIC_AUTH_PASSWORD", "true");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("hides a sign in route the deployment has not configured", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_DISCORD", "");
    render(<LoginPage />);
    expect(screen.queryByRole("button", { name: /continue with discord/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
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
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /magic link/i })).toBeInTheDocument();
  });

  it("confirms the link was sent after submitting an email", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "tenno@example.com");
    await user.click(screen.getByRole("button", { name: /magic link/i }));
    expect(signIn).toHaveBeenCalledWith("resend", {
      email: "tenno@example.com",
      redirectTo: "/dashboard",
    });
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText(/tenno@example.com/)).toBeInTheDocument();
  });
});

describe("email and password sign in", () => {
  beforeEach(() => {
    signIn.mockClear();
    signIn.mockResolvedValue({ signingIn: true });
    vi.stubEnv("NEXT_PUBLIC_AUTH_PASSWORD", "true");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("creates an account from the toggle, then signs in with the same form", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /create one/i }));
    await user.type(screen.getByLabelText("Email"), "tenno@example.com");
    await user.type(screen.getByLabelText("Password"), "voidwatch123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(signIn).toHaveBeenCalledWith("password", {
      email: "tenno@example.com",
      password: "voidwatch123",
      flow: "signUp",
      redirectTo: "/dashboard",
    });

    await user.click(screen.getByRole("button", { name: /sign in instead/i }));
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signIn).toHaveBeenLastCalledWith("password", {
      email: "tenno@example.com",
      password: "voidwatch123",
      flow: "signIn",
      redirectTo: "/dashboard",
    });
  });

  it("says what went wrong when the password is refused", async () => {
    const user = userEvent.setup();
    signIn.mockRejectedValueOnce(new Error("InvalidSecret"));
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "tenno@example.com");
    await user.type(screen.getByLabelText("Password"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/wrong email or password/i);
  });

  it("hides the password form where the deployment has not switched it on", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_PASSWORD", "");
    render(<LoginPage />);
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });
});
