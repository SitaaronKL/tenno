import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LandingPage from "./page";

describe("landing page", () => {
  it("leads with the headline and both calls to action", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { level: 1, name: /never miss a fissure again/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /get started/i })[0]).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /see the dashboard/i })).toHaveAttribute("href", "/dashboard");
  });

  it("offers the section links and the sign up in the floating bar", () => {
    render(<LandingPage />);
    const bar = within(screen.getByRole("navigation", { name: /sections/i }));
    for (const [label, href] of [
      ["Product", "#product"],
      ["Features", "#features"],
      ["iMessage", "#imessage"],
      ["How it works", "#how"],
    ]) {
      expect(bar.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
    expect(bar.getByRole("link", { name: /get started/i })).toHaveAttribute("href", "/login");
  });

  it("shows both sides of the Messages thread", () => {
    render(<LandingPage />);
    expect(screen.getByText(/any axi survival up right now/i)).toBeInTheDocument();
    expect(screen.getByText(/one Axi Survival on Mot, Void/i)).toBeInTheDocument();
  });
});
