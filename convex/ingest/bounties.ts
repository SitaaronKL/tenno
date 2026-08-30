import type { BountyJob } from "../../lib/contracts/worldstate";

// Neither upstream says where a board is, both send an empty Nodes list, so the hub is written here.
const NODES: Record<string, string> = {
  Ostrons: "Cetus (Earth)",
  "Solaris United": "Fortuna (Venus)",
  Entrati: "Necralisk (Deimos)",
  Cavia: "Sanctum Anatomica (Deimos)",
  "The Holdfasts": "Chrysalith (Zariman)",
  "The Hex": "Höllvania Central Mall (Höllvania)",
};

export function bountyNode(syndicate: string): string {
  return NODES[syndicate] ?? "";
}

// The level range the board prints, and the standing a full run of every stage pays.
export function job(
  minLevel: number,
  maxLevel: number,
  standingStages: number[],
  rewards: string[],
): BountyJob {
  return {
    level: `${minLevel} - ${maxLevel}`,
    minLevel,
    maxLevel,
    standing: standingStages.reduce((total, stage) => total + stage, 0),
    rewards: [...new Set(rewards)].filter((r) => r !== ""),
  };
}
