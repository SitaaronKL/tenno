import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GuidePage from "./page";

describe("the guide", () => {
  it("walks every part of the app in order", () => {
    render(<GuidePage />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([
      "World state",
      "Notifications",
      "iMessage",
      "Personal Cephalon",
      "Builds, Mastery and Resources",
      "Free, forever",
    ]);
  });

  it("tells the reader the exact iMessage opt in", () => {
    render(<GuidePage />);
    expect(screen.getByText(/text START/)).toBeInTheDocument();
  });

  it("links the reader onward to settings and chat", () => {
    render(<GuidePage />);
    expect(screen.getByRole("link", { name: /Settings/ })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("link", { name: /open the chat/i })).toHaveAttribute("href", "/chat");
  });
});
