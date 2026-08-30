import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { EventsPanel } from "./events";
import { invasionRewards } from "./invasions";

const reward = (item: string) => ({ item, count: 3, credits: 0 });
const invasions = [
  { key: "1", node: "Titan (Saturn)", description: "Corpus Siege", completion: 80, startsAt: 0,
    attacker: { faction: "Corpus", reward: reward("Fieldron") }, defender: { faction: "Grineer", reward: reward("Detonite Injector") } },
  { key: "2", node: "Iliad (Phobos)", description: "Phorid Manifestation", completion: 23, startsAt: 0,
    attacker: { faction: "Infested", reward: null }, defender: { faction: "Corpus", reward: reward("Mutagen Mass") } },
];
const alerts = [{ key: "a", node: "Selkie (Sedna)", missionType: "Survival", enemy: "Grineer", startsAt: 0, expiresAt: Date.now() + 3_600_000, rewards: [{ item: "Nakak Pearls", count: 175, credits: 0 }] }];

describe("events panel", () => {
  it("lists invasion rewards without factions or percentages, then switches to alerts", async () => {
    render(<EventsPanel invasions={invasions} alerts={alerts} />);
    expect(screen.getByText("Fieldron x3 / Detonite Injector x3")).toBeInTheDocument();
    expect(screen.getByText("Mutagen Mass x3 · vs Infested")).toBeInTheDocument();
    expect(screen.queryByText(/80%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Attacker/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Alerts" }));
    expect(screen.getByText("Nakak Pearls")).toBeInTheDocument();
  });

  it("names the side you fight on a one sided invasion", () => {
    expect(invasionRewards(invasions[1])).toBe("Mutagen Mass x3 · vs Infested");
  });
});
