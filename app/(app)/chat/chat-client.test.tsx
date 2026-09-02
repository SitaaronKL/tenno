import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  results: [] as { key: string; role: string; text: string; status: string; order: number; stepOrder: number }[],
  status: "Exhausted" as string,
  loadMore: vi.fn(),
  threads: [] as { id: string; title: string; createdAt: number }[],
  mutate: vi.fn(() => Promise.resolve("t1")),
  send: vi.fn(() => new Promise<never>(() => {})),
};

vi.mock("convex/react", () => ({
  useMutation: () => state.mutate,
  useAction: () => state.send,
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
    state.mutate = vi.fn(() => Promise.resolve("t1"));
    state.send = vi.fn(() => new Promise<never>(() => {}));
    window.history.replaceState(null, "", "/");
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

  it("a described rule sends itself on arrival", async () => {
    window.history.replaceState(null, "", "/chat?describe=axi%20survival%20fissures");
    render(<Chat />);
    await waitFor(() =>
      expect(state.send).toHaveBeenCalledWith({ threadId: "t1", text: "axi survival fissures" }),
    );
    // The thread takes its name from the words, the address bar is clean again.
    expect(state.mutate).toHaveBeenCalledWith({ title: "axi survival fissures" });
    expect(window.location.search).toBe("");
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

  it("orders by conversation position, whatever order the pages arrive in", () => {
    state.results = [
      { key: "b", role: "assistant", text: "second", status: "success", order: 1, stepOrder: 1 },
      { key: "a", role: "user", text: "first", status: "success", order: 1, stepOrder: 0 },
    ];
    render(<Chat />);

    const shown = screen.getAllByText(/first|second/).map((el) => el.textContent);
    expect(shown).toEqual(["first", "second"]);
  });

  it("offers older messages only when there are older messages", async () => {
    const user = userEvent.setup();
    state.results = [{ key: "a", role: "user", text: "hello", status: "success", order: 0, stepOrder: 0 }];
    state.status = "CanLoadMore";
    render(<Chat />);

    await user.click(screen.getByRole("button", { name: "Load older messages" }));
    expect(state.loadMore).toHaveBeenCalledWith(50);
  });

  it("does not offer older messages at the start of a thread", () => {
    state.results = [{ key: "a", role: "user", text: "hello", status: "success", order: 0, stepOrder: 0 }];
    render(<Chat />);
    expect(screen.queryByRole("button", { name: "Load older messages" })).not.toBeInTheDocument();
  });
});
