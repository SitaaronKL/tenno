import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  results: [] as { key: string; role: string; text: string; status: string }[],
  status: "Exhausted" as string,
  loadMore: vi.fn(),
  threads: [] as { id: string; title: string; createdAt: number }[],
  mutate: vi.fn(() => new Promise<never>(() => {})),
};

// The thread never resolves here, which is exactly the first paint we care about.
vi.mock("convex/react", () => ({
  useMutation: () => state.mutate,
  useAction: () => () => new Promise(() => {}),
  useQuery: () => state.threads,
  usePaginatedQuery: () => ({
    results: state.results,
    status: state.status,
    loadMore: state.loadMore,
  }),
}));

import Chat from "./chat-client";

describe("Chat", () => {
  beforeEach(() => {
    state.results = [];
    state.status = "Exhausted";
    state.loadMore = vi.fn();
    state.threads = [];
    state.mutate = vi.fn(() => new Promise<never>(() => {}));
  });

  it("greets the player on the first paint, with no loading line", () => {
    render(<Chat />);
    expect(screen.getByText("What do you want to know, Tenno?")).toBeInTheDocument();
    expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
  });

  it("opens to a new chat, not the last conversation", () => {
    render(<Chat />);
    // No thread is created or resumed until the first message is sent.
    expect(state.mutate).not.toHaveBeenCalled();
  });

  it("offers a new chat and the chat history", () => {
    render(<Chat />);
    expect(screen.getByRole("button", { name: "New chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chat history" })).toBeInTheDocument();
  });

  it("offers three suggestions, not a menu", () => {
    render(<Chat />);
    const chips = screen
      .getAllByRole("button")
      .filter((b) => b.textContent && b.textContent.length > 8 && b.getAttribute("aria-label") === null);
    expect(chips).toHaveLength(3);
  });

  it("keeps the greeting once the thread loads empty", () => {
    state.results = [];
    render(<Chat />);
    expect(screen.getByText("What do you want to know, Tenno?")).toBeInTheDocument();
  });

  it("reads oldest at the top even though the thread answers newest first", () => {
    state.results = [
      { key: "b", role: "assistant", text: "second", status: "success" },
      { key: "a", role: "user", text: "first", status: "success" },
    ];
    render(<Chat />);

    const shown = screen.getAllByText(/first|second/).map((el) => el.textContent);
    expect(shown).toEqual(["first", "second"]);
  });

  it("offers older messages only when there are older messages", async () => {
    const user = userEvent.setup();
    state.results = [{ key: "a", role: "user", text: "hello", status: "success" }];
    state.status = "CanLoadMore";
    render(<Chat />);

    await user.click(screen.getByRole("button", { name: "Load older messages" }));
    expect(state.loadMore).toHaveBeenCalledWith(50);
  });

  it("does not offer older messages at the start of a thread", () => {
    state.results = [{ key: "a", role: "user", text: "hello", status: "success" }];
    render(<Chat />);
    expect(screen.queryByRole("button", { name: "Load older messages" })).not.toBeInTheDocument();
  });
});
