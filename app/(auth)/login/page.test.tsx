import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signIn = vi.fn(async () => ({ signingIn: true }));
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn, signOut: vi.fn() }),
}));

import LoginPage from "@/app/(auth)/login/page";

describe("login page", () => {
  beforeEach(() => signIn.mockClear());

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
