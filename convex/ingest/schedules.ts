import type { Arbitration } from "../../lib/contracts/worldstate";
import { nodeEnemy, nodeMissionType, nodeName } from "./names";
import arbitrations from "./arbitrations.json";
import incursions from "./spIncursions.json";
import tiers from "./arbyTiers.json";

// Neither rotation is in DE's world state. browse.wf publishes precomputed schedules and asks only
// for credit, so both files are mirrored here by scripts/refresh-schedules.mjs and read by clock.
// Each file is one contiguous run: `from` is the epoch second of entry zero, then a fixed step.
export const INCURSION_SOURCE = incursions.source;
export const ARBITRATION_SOURCE = arbitrations.source;

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

const TIERS = tiers.tiers as Record<string, string>;

function slot(from: number, step: number, length: number, now: number): number {
  const index = Math.floor((now - from * 1000) / step);
  return index >= 0 && index < length ? index : -1;
}

// The six Steel Path Incursion nodes for the UTC day, by friendly name.
export function todaysIncursions(now: number): string[] {
  const index = slot(incursions.from, DAY_MS, incursions.days.length, now);
  if (index < 0) return [];
  return incursions.days[index].map(nodeName);
}

// The arbitration running this hour. It always ends on the hour boundary.
export function currentArbitration(now: number): Arbitration | null {
  const index = slot(arbitrations.from, HOUR_MS, arbitrations.hours.length, now);
  if (index < 0) return null;
  const id = arbitrations.hours[index];
  return {
    node: nodeName(id),
    missionType: nodeMissionType(id),
    faction: nodeEnemy(id),
    tier: TIERS[id] ?? "",
    expiresAt: Math.floor(now / HOUR_MS) * HOUR_MS + HOUR_MS,
  };
}
