"use client";

import { useState } from "react";

import { Segmented } from "@/components/segmented";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useHidden } from "@/components/hidden";
import { boardKey } from "@/lib/contracts/preferences";

import type { Bounty, BountyJob, RewardChances, WorldState } from "@/lib/contracts/worldstate";
import { WorkflowIcon } from "@/components/icons/workflow";
import { Empty, Panel } from "./panel";
import { Countdown } from "./countdown";
import { cn } from "@/lib/utils";
import { useNow } from "./use-now";

// The data slice writes bounties into world state, so the panel reads the contract type.
export function bountiesOf(state: WorldState): Bounty[] {
  return state.bounties ?? [];
}

export function levelRange(job: BountyJob): string {
  return job.minLevel === job.maxLevel ? `${job.minLevel}` : `${job.minLevel} to ${job.maxLevel}`;
}

// Most people run a board for the mission, so the row names that and hides the rest.
export function missionOf(job: BountyJob): string {
  return job.missionType ?? "Bounty";
}

// Chances come out of the drop tables to two decimals, trailing zeros read as false precision.
export function chance(percent: number): string {
  return `${Number(percent.toFixed(2))}%`;
}

// A fixed board knows its odds, so it lists the pool per rotation instead of one flat line.
function RotationTable({ table }: { table: RewardChances[] }) {
  return (
    <div className="grid gap-3 pb-2 sm:grid-cols-3">
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

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(
        "shrink-0 text-muted-foreground transition-transform duration-150 ease-out motion-reduce:transition-none",
        open ? "rotate-0" : "-rotate-90",
      )}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Job({
  job,
  open,
  onOpenChange,
}: {
  job: BountyJob;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  return (
    <li>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        {/* The whole row is the trigger, so a click anywhere opens the rewards. */}
        <CollapsibleTrigger className="flex w-full items-center gap-3 py-2 text-left transition-colors duration-150 ease-out hover:text-foreground">
          <span className="w-16 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {levelRange(job)}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">{missionOf(job)}</span>
          {job.standing > 0 ? (
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
              {job.standing} standing
            </span>
          ) : null}
          <Chevron open={open} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          {job.rewardTable ? (
            <RotationTable table={job.rewardTable} />
          ) : (
            <p className="pb-2 text-xs text-muted-foreground">
              {job.rewards.join(", ") || "No listed reward"}
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

// Short names keep seven boards on one toggle row.
const SHORT: Record<string, string> = {
  Ostron: "Cetus",
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
  const hidden = useHidden();
  // DE lists the next rotation beside the current one, one board per syndicate is enough.
  const open = Array.from(
    bounties
      .filter((b) => b.expiresAt > now)
      .filter((b) => {
        const key = boardKey(b.syndicate);
        return key === null || !hidden.has(key);
      })
      .sort((a, b) => a.expiresAt - b.expiresAt)
      .reduce((m, b) => (m.has(b.syndicate) ? m : m.set(b.syndicate, b)), new Map<string, Bounty>())
      .values(),
  );
  const [pick, setPick] = useState<string | null>(null);
  // One row at a time, so a long reward table never buries the board below it.
  const [row, setRow] = useState<string | null>(null);
  const options = open.map((b) => ({ value: b.syndicate, label: SHORT[b.syndicate] ?? b.syndicate }));
  const board = open.find((b) => b.syndicate === pick) ?? open[0];

  return (
    <Panel
      title="Bounties"
      icon={WorkflowIcon}
      count={board ? `${board.jobs.length}` : undefined}
      className="md:col-span-2 lg:col-span-3"
      action={board ? <Countdown target={board.expiresAt} now={now} /> : undefined}
    >
      {!board ? (
        <Empty>No bounties offered.</Empty>
      ) : (
        <>
          {open.length > 1 ? (
            <div className="mb-2 flex justify-start">
              <Segmented label="Bounty board" options={options} value={board.syndicate} onChange={setPick} />
            </div>
          ) : null}
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span className="truncate font-medium">{board.syndicate}</span>
            <span className="truncate text-xs text-muted-foreground">{board.node}</span>
            {/* Upstream sends this board with no jobs, the pool below is the drop table. */}
            {board.static ? (
              <span className="shrink-0 text-xs text-muted-foreground">fixed board</span>
            ) : null}
          </div>
          <ul className="divide-y divide-border">
            {board.jobs.map((job, index) => {
              const key = `${board.syndicate}-${index}`;
              return (
                <Job
                  key={key}
                  job={job}
                  open={row === key}
                  onOpenChange={(next) => setRow(next ? key : null)}
                />
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}
