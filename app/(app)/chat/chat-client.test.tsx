import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = { messages: undefined as unknown };

// The thread never resolves here, which is exactly the first paint we care about.
vi.mock("convex/react", () => ({
  useMutation: () => () => new Promise(() => {}),
  useAction: () => () => new Promise(() => {}),
  useQuery: () => state.messages,
}));

import Chat from "./chat-client";

describe("Chat", () => {
  beforeEach(() => {
    state.messages = undefined;
  });

  it("greets the player on the first paint, with no loading line", () => {
    render(<Chat />);
    expect(screen.getByText("What do you want to know, Tenno?")).toBeInTheDocument();
    expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
  });

  it("offers three suggestions, not a menu", () => {
    render(<Chat />);
    const chips = screen
      .getAllByRole("button")
      .filter((b) => b.textContent && b.textContent.length > 8 && b.getAttribute("aria-label") === null);
    expect(chips).toHaveLength(3);
  });

  it("keeps the greeting once the thread loads empty", () => {
    state.messages = [];
    render(<Chat />);
    expect(screen.getByText("What do you want to know, Tenno?")).toBeInTheDocument();
  });
});
