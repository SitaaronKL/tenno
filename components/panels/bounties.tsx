"use client";

import type { WorldState } from "@/lib/contracts/worldstate";
import { WorkflowIcon } from "@/components/icons/workflow";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Empty, Panel } from "./panel";
import { Countdown } from "./countdown";
import { TruncatedCell } from "./data-table";
import { useNow } from "./use-now";

export type BountyJob = {
  level: string;
  minLevel: number;
  maxLevel: number;
  rewards: string[];
  standing: number;
};

export type Bounty = {
  syndicate: string;
  node: string;
  expiresAt: number;
  jobs: BountyJob[];
};

// The data slice adds bounties to WorldState, so read it as optional until that lands.
export function bountiesOf(state: WorldState): Bounty[] {
  const value = (state as WorldState & { bounties?: Bounty[] }).bounties;
  return Array.isArray(value) ? value : [];
}

export function levelRange(job: BountyJob): string {
  return job.minLevel === job.maxLevel ? `${job.minLevel}` : `${job.minLevel} to ${job.maxLevel}`;
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
                  <span className="truncate">{b.syndicate}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {b.node}
                  </span>
                  <Countdown target={b.expiresAt} now={now} className="ml-auto" />
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="divide-y divide-border">
                  {b.jobs.map((job) => (
                    <li key={job.level} className="flex items-baseline gap-2 py-2">
                      <span className="w-24 shrink-0 font-medium">{job.level}</span>
                      <span className="min-w-0 flex-1">
                        <TruncatedCell
                          text={job.rewards.join(", ") || "No listed reward"}
                          className="text-muted-foreground"
                        />
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                        lvl {levelRange(job)} · {job.standing} standing
                      </span>
                    </li>
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
