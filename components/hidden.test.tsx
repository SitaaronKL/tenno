import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HIDDEN_GROUPS, HIDDEN_KEYS, boardKey, isHiddenKey } from "@/lib/contracts/preferences";
import { HiddenSet, useHidden, useHiddenPrefs } from "./hidden";

const update = vi.fn().mockResolvedValue(null);
// A guest has no profile, so the choice has nowhere to go but the browser.
vi.mock("@/components/rules/api", () => ({
  useProfile: () => null,
  useUpdateProfile: () => update,
}));

function Probe() {
  const hidden = useHidden();
  return <p>{hidden.has("tile.baro") ? "baro hidden" : "baro shown"}</p>;
}

describe("the hidden key list", () => {
  it("names every group the settings page draws", () => {
    expect(HIDDEN_GROUPS.map((g) => g.title)).toEqual(["Boxes", "Bounty boards", "Tiles"]);
  });

  it("carries the keys the other slice is adding, so its switches are already here", () => {
    expect(HIDDEN_KEYS).toContain("box.incursions");
    expect(HIDDEN_KEYS).toContain("box.weekly");
    expect(HIDDEN_KEYS).toContain("tile.arbitration");
  });

  it("knows its own keys and nothing else", () => {
    expect(isHiddenKey("board.vox")).toBe(true);
    expect(isHiddenKey("board.mars")).toBe(false);
  });

  it("maps a syndicate to its board key", () => {
    expect(boardKey("Vox Solaris")).toBe("board.vox");
    expect(boardKey("Ostron")).toBe("board.cetus");
    expect(boardKey("Unknown")).toBe(null);
  });
});

describe("the hidden set", () => {
  it("hides nothing when nobody provided one", () => {
    render(<Probe />);
    expect(screen.getByText("baro shown")).toBeInTheDocument();
  });

  it("reaches every reader below it", () => {
    render(
      <HiddenSet hidden={new Set(["tile.baro"])}>
        <Probe />
      </HiddenSet>,
    );
    expect(screen.getByText("baro hidden")).toBeInTheDocument();
  });
});

function Board() {
  const { hidden, setHidden } = useHiddenPrefs();
  return (
    <button type="button" onClick={() => setHidden("board.vox", !hidden.has("board.vox"))}>
      {hidden.has("board.vox") ? "Vox hidden" : "Vox shown"}
    </button>
  );
}

describe("a guest's choice", () => {
  beforeEach(() => {
    window.localStorage.clear();
    update.mockClear();
  });

  it("starts with everything shown", () => {
    render(<Board />);
    expect(screen.getByRole("button", { name: "Vox shown" })).toBeInTheDocument();
  });

  it("lands in the browser rather than in a profile", async () => {
    const user = userEvent.setup();
    render(<Board />);

    await user.click(screen.getByRole("button"));

    expect(window.localStorage.getItem("voidwatch.hidden")).toBe('["board.vox"]');
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Vox hidden" })).toBeInTheDocument();
  });

  it("reads back what the last visit saved", () => {
    window.localStorage.setItem("voidwatch.hidden", '["board.vox"]');
    render(<Board />);
    expect(screen.getByRole("button", { name: "Vox hidden" })).toBeInTheDocument();
  });
});
