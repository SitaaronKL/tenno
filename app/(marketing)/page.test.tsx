import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LandingPage from "./page";

describe("landing page", () => {
  it("shows the pitch and both calls to action", () => {
    render(<LandingPage />);
    expect(screen.getByText(/never miss a fissure/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /see the dashboard/i })).toHaveAttribute("href", "/dashboard");
  });
});
