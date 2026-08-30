import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TIERS, TierBadge } from "./tier-badge";

describe("Tier badge", () => {
  it("shows a relic icon named after the tier", () => {
    for (const tier of TIERS) {
      const { unmount } = render(<TierBadge tier={tier} />);
      const icon = screen.getByRole("img", { name: tier });
      expect(icon).toHaveAttribute("src", expect.stringContaining(tier.toLowerCase()));
      unmount();
    }
  });

  it("cycles the Omnia pill through the spectrum, and only Omnia", () => {
    const { container, unmount } = render(<TierBadge tier="Omnia" />);
    expect(container.querySelector(".tier-omnia")).toBeInTheDocument();
    unmount();

    const other = render(<TierBadge tier="Lith" />);
    expect(other.container.querySelector(".tier-omnia")).not.toBeInTheDocument();
  });

  it("leaves an unknown tier plain, with no icon to mislead", () => {
    render(<TierBadge tier="Kuva" />);
    expect(screen.getByText("Kuva")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
