import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActiveEvents } from "./active-events";

const now = Date.now();

describe("active events line", () => {
  it("names every running event", () => {
    render(
      <ActiveEvents
        events={[
          { key: "a", name: "Tactical Alert: Dog Days", expiresAt: now + 86_400_000 },
          { key: "b", name: "Operation: Belly of the Beast", expiresAt: now + 172_800_000 },
        ]}
      />,
    );
    expect(screen.getByText(/Tactical Alert: Dog Days/)).toBeInTheDocument();
    expect(screen.getByText(/Operation: Belly of the Beast/)).toBeInTheDocument();
  });

  it("says nothing at all when no event is running", () => {
    const { container } = render(<ActiveEvents events={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("leaves out an event that has already ended", () => {
    render(<ActiveEvents events={[{ key: "a", name: "Plague Star", expiresAt: now - 1000 }]} />);
    expect(screen.queryByText(/Plague Star/)).not.toBeInTheDocument();
  });
});
