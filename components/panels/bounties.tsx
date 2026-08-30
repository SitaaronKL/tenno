"use client";

import type { Bounty, BountyJob, RewardChances, WorldState } from "@/lib/contracts/worldstate";
import { WorkflowIcon } from "@/components/icons/workflow";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

export function BountiesPanel({ bounties }: { bounties: Bounty[] }) {
  const now = useNow();
  const open = bounties.filter((b) => b.expiresAt > now);

  return (
    <Panel
      title="Bounties"
      icon={WorkflowIcon}
      count={open.length}
      className="md:col-span-2 lg:col-span-2"
    >
      {open.length === 0 ? (
        <Empty>No bounties offered.</Empty>
      ) : (
        <Accordion multiple={false} className="text-sm">
          {open.map((b) => (
            <AccordionItem key={`${b.syndicate}-${b.node}`} value={`${b.syndicate}-${b.node}`}>
              <AccordionTrigger className="gap-2">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span data-primary className="truncate">{b.syndicate}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {b.node}
                  </span>
                  {/* Upstream sends this board with no jobs, the pool below is the drop table. */}
                  {b.static ? (
                    <span className="shrink-0 text-xs font-normal text-muted-foreground">
                      fixed board
                    </span>
                  ) : null}
                  <Countdown target={b.expiresAt} now={now} className="ml-auto" />
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="divide-y divide-border">
                  {b.jobs.map((job, index) => (
                    <Job key={`${job.level}-${index}`} job={job} />
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </Panel>
  );
}
