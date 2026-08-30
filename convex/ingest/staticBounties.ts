import type { Bounty, BountyJob, RewardChances } from "../../lib/contracts/worldstate";
import { bountyNode } from "./bounties";
import table from "./staticBounties.json";

// Four boards are fixed: DE lists them in the world state with zero jobs, but they hand out the same
// level bands and the same reward pools every rotation. The pools come from DE's own drop tables,
// shipped as JSON by scripts/build-static-bounties.mjs so ingest never depends on a second upstream.
interface StaticJob {
  level: string;
  minLevel: number;
  maxLevel: number;
  title?: string;
  rewardTable: RewardChances[];
}

interface StaticBoard {
  syndicate: string;
  node: string;
  jobs: StaticJob[];
}

const DATA = table as { source: string; hash: string; modified: number; boards: StaticBoard[] };

export const STATIC_BOUNTY_SOURCE = DATA.source;
export const STATIC_BOUNTY_MODIFIED = DATA.modified;

// The Zariman and Cavia boards roll with the Holdfasts cycle, every 2.5 hours. Only a feed that
// sends no expiry at all lands here, so the boundary is aligned to the epoch rather than the cycle.
const ROTATION_MS = 9_000_000;

export function nextRotation(at: number): number {
  return Math.ceil((at + 1) / ROTATION_MS) * ROTATION_MS;
}

function staticJob(job: StaticJob): BountyJob {
  return {
    level: job.level,
    minLevel: job.minLevel,
    maxLevel: job.maxLevel,
    // A fixed board pays standing per stage, and neither feed nor drop table says how much.
    standing: 0,
    rewards: job.rewardTable.flatMap((r) => r.rewards.map((x) => x.item)),
    title: job.title,
    rewardTable: job.rewardTable,
  };
}

// Boards upstream already filled win, the rest are filled from the drop tables.
// expiries maps a syndicate name to the expiry upstream printed for it, the rotation still cycles.
export function withStaticBounties(
  live: Bounty[],
  expiries: Record<string, number>,
  at: number,
): Bounty[] {
  const filled = [...live];
  for (const board of DATA.boards) {
    if (live.some((b) => b.syndicate === board.syndicate)) continue;
    // A board whose jobs carry no rewards in the drop tables is not a real board yet.
    if (board.jobs.every((job) => job.rewardTable.length === 0)) continue;
    const upstream = expiries[board.syndicate] ?? 0;
    filled.push({
      syndicate: board.syndicate,
      node: bountyNode(board.syndicate) || board.node,
      expiresAt: upstream > at ? upstream : nextRotation(at),
      static: true,
      jobs: board.jobs.map(staticJob),
    });
  }
  return filled;
}
