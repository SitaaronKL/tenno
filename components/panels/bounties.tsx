"use client";

import { useState } from "react";

import { Segmented } from "@/components/segmented";

import type { Bounty, BountyJob, RewardChances, WorldState } from "@/lib/contracts/worldstate";
import { WorkflowIcon } from "@/components/icons/workflow";
import { Empty, Panel } from "./panel";
import { Countdown } from "./countdown";
import { TruncatedCell } from "@/components/ui/data-table";
import { useNow } from "./use-now";

// The data slice writes bounties into world state, so the panel reads the contract type.
export function bountiesOf(state: WorldState): Bounty[] {
  return state.bounties ?? [];
}

export function levelRange(job: BountyJob): string {
  return job.minLevel === job.maxLevel ? `${job.minLevel}` : `${job.minLevel} to ${job.maxLevel}`;
}

// Chances come out of the drop tables to two decimals, trailing zeros read as false precision.
export function chance(percent: number): string {
  return `${Number(percent.toFixed(2))}%`;
}

// A fixed board knows its odds, so it lists the pool per rotation instead of one flat line.
function RotationTable({ table }: { table: RewardChances[] }) {
  return (
    <div className="mt-2 grid gap-3 sm:grid-cols-3">
      {table.map((rotation) => (
        <div key={rotation.rotation}>
          <p className="pb-1 text-xs font-medium tracking-wide text-muted-foreground">
            Rotation {rotation.rotation}
          </p>
          <ul className="space-y-0.5">
            {rotation.rewards.map((reward) => (
              <li key={reward.item} className="flex items-baseline gap-2 text-xs">
                <span className="min-w-0 flex-1 truncate">{reward.item}</span>
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                  {chance(reward.chance)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Job({ job }: { job: BountyJob }) {
  return (
    <li className="py-2">
      <div className="flex items-baseline gap-2">
        <span className="w-24 shrink-0 font-medium">{job.title ?? job.level}</span>
        <span className="min-w-0 flex-1">
          {job.rewardTable ? null : (
            <TruncatedCell
              text={job.rewards.join(", ") || "No listed reward"}
              className="text-muted-foreground"
            />
          )}
        </span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          lvl {levelRange(job)}
          {job.standing > 0 ? ` · ${job.standing} standing` : ""}
        </span>
      </div>
      {job.rewardTable ? <RotationTable table={job.rewardTable} /> : null}
    </li>
  );
}

// Short names keep seven boards on one toggle row.
const SHORT: Record<string, string> = {
  Ostrons: "Cetus",
  "Solaris United": "Fortuna",
  Entrati: "Deimos",
  "The Holdfasts": "Zariman",
  Cavia: "Cavia",
  "Vox Solaris": "Vox",
  "The Hex": "Hex",
};

export function BountiesPanel({ bounties }: { bounties: Bounty[] }) {
  const now = useNow();
  const open = bounties.filter((b) => b.expiresAt > now);
  const [pick, setPick] = useState<string | null>(null);
  const options = open.map((b) => ({ value: b.syndicate, label: SHORT[b.syndicate] ?? b.syndicate }));
  const board = open.find((b) => b.syndicate === pick) ?? open[0];

  return (
    <Panel
      title="Bounties"
      icon={WorkflowIcon}
      count={board ? `${board.jobs.length}` : undefined}
      className="md:col-span-2 lg:col-span-3"
      action={
        open.length > 1 ? (
          <Segmented label="Bounty board" options={options} value={board.syndicate} onChange={setPick} />
        ) : undefined
      }
    >
      {!board ? (
        <Empty>No bounties offered.</Empty>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span className="truncate font-medium">{board.syndicate}</span>
            <span className="truncate text-xs text-muted-foreground">{board.node}</span>
            {/* Upstream sends this board with no jobs, the pool below is the drop table. */}
            {board.static ? (
              <span className="shrink-0 text-xs text-muted-foreground">fixed board</span>
            ) : null}
            <Countdown target={board.expiresAt} now={now} className="ml-auto" />
          </div>
          <ul className="divide-y divide-border">
            {board.jobs.map((job, index) => (
              <Job key={`${job.level}-${index}`} job={job} />
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
