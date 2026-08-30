import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "./not-found";

describe("not found page", () => {
  it("shows the spinning 404 and a way home", () => {
    render(<NotFound />);
    expect(screen.getByRole("img", { name: "404" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /lost in the void/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to voidwatch/i })).toHaveAttribute("href", "/");
  });
});
