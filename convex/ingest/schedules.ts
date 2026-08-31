import type { Arbitration } from "../../lib/contracts/worldstate";
import { nodeEnemy, nodeMissionType, nodeName } from "./names";
import { ARBITRATIONS, ARBY_TIERS, INCURSIONS } from "./scheduleData";

// Neither rotation is in DE's world state. browse.wf publishes precomputed schedules and asks only
// for credit, so both files are mirrored here by scripts/refresh-schedules.mjs and read by clock.
// Each file is one contiguous run: `from` is the epoch second of entry zero, then a fixed step.
export const INCURSION_SOURCE = INCURSIONS.source;
export const ARBITRATION_SOURCE = ARBITRATIONS.source;

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

function slot(from: number, step: number, length: number, now: number): number {
  const index = Math.floor((now - from * 1000) / step);
  return index >= 0 && index < length ? index : -1;
}

// The six Steel Path Incursion nodes for the UTC day, by friendly name.
export function todaysIncursions(now: number): string[] {
  const index = slot(INCURSIONS.from, DAY_MS, INCURSIONS.days.length, now);
  if (index < 0) return [];
  return INCURSIONS.days[index].map(nodeName);
}

// The arbitration running this hour. It always ends on the hour boundary.
export function currentArbitration(now: number): Arbitration | null {
  const index = slot(ARBITRATIONS.from, HOUR_MS, ARBITRATIONS.hours.length, now);
  if (index < 0) return null;
  const id = ARBITRATIONS.hours[index];
  return {
    node: nodeName(id),
    missionType: nodeMissionType(id),
    faction: nodeEnemy(id),
    tier: ARBY_TIERS[id] ?? "",
    expiresAt: Math.floor(now / HOUR_MS) * HOUR_MS + HOUR_MS,
  };
}

// The last moment each shipped schedule still answers. Past it both go quiet, so the cron below
// warns while there is still a week to run scripts/refresh-schedules.mjs.
export function scheduleHorizons(): { incursions: number; arbitrations: number } {
  return {
    incursions: (INCURSIONS.from + INCURSIONS.days.length * 86_400) * 1000,
    arbitrations: (ARBITRATIONS.from + ARBITRATIONS.hours.length * 3_600) * 1000,
  };
}
