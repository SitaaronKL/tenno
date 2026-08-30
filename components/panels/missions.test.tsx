import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MissionSetPanel } from "./missions";

const sortie = {
  key: "s", boss: "Tyl Regor", faction: "Grineer", startsAt: 0, expiresAt: Date.now() + 3_600_000,
  missions: [{ node: "War (Mars)", missionType: "Rescue", modifier: "Eximus Stronghold" }],
};
const archon = {
  key: "a", boss: "Archon Nira", faction: "Narmer", startsAt: 0, expiresAt: Date.now() + 7_200_000,
  missions: [{ node: "Callisto (Jupiter)", missionType: "Rescue", modifier: "" }],
};

describe("mission set panel", () => {
  it("shows the sortie first and switches to the archon hunt from the toggle", async () => {
    render(<MissionSetPanel sortie={sortie} archonHunt={archon} />);
    expect(screen.getByText("Tyl Regor")).toBeInTheDocument();
    expect(screen.queryByText("Archon Nira")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Archon Hunt" }));
    expect(screen.getByText("Archon Nira")).toBeInTheDocument();
    expect(screen.queryByText("Tyl Regor")).not.toBeInTheDocument();
  });
});
