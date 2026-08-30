"use client";

import type { Bounty, BountyJob, WorldState } from "@/lib/contracts/worldstate";
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
                  <Countdown target={b.expiresAt} now={now} className="ml-auto" />
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="divide-y divide-border">
                  {b.jobs.map((job, index) => (
                    <li key={`${job.level}-${index}`} className="flex items-baseline gap-2 py-2">
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
