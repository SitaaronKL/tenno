"use client";

import { useState } from "react";

import { CheckIcon } from "@/components/icons/check";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Circuit } from "@/lib/contracts/worldstate";
import { PALLADINO_WARES, wareLabel } from "@/lib/palladino";
import { teshinOffering } from "@/lib/teshin";
import { cn } from "@/lib/utils";
import { CheckoffRow, remaining, useCheckoffs, weeklyKey } from "./checkoffs";
import { Countdown } from "./countdown";
import { nextWeeklyReset } from "./cycles";
import { Panel } from "./panel";
import { useNow } from "./use-now";

const CLASS = "md:col-span-2 lg:col-span-3";

function Lines({ label, value }: { label: string; value: string }) {
  return (
    <>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="truncate">{value}</p>
    </>
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

// Palladino sells a dozen things for slivers, one of each per week, so the row holds a list rather
// than one tick. The wares come from the wiki, see lib/palladino.json.
function IronWake({ reset, keys }: { reset: number; keys: string[] }) {
  const [open, setOpen] = useState(false);
  const { done } = useCheckoffs();
  const left = remaining(keys, done);
  return (
    <li>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 py-2 text-left transition-colors duration-150 ease-out hover:text-foreground">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">Palladino&apos;s Iron Wake</p>
            <p className="truncate">
              {left} of {keys.length} wares left, for Riven Slivers
            </p>
          </div>
          <Chevron open={open} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="divide-y divide-border border-t border-border pl-3">
            {PALLADINO_WARES.map((ware, i) => (
              <CheckoffRow key={ware.key} id={keys[i]} expiresAt={reset} label={wareLabel(ware)}>
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{ware.item}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {ware.slivers} slivers
                  </span>
                </div>
              </CheckoffRow>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

// The weekly chores that are not missions: Teshin's offer, both Circuit pools, Palladino's trade,
export function WeeklyPanel({
  circuit,
}: {
  circuit?: Circuit | null;
}) {
  const now = useNow();
  const { done } = useCheckoffs();
  const reset = nextWeeklyReset(now);
  const teshin = teshinOffering(now);

  const rows = [
    { task: "teshin", label: "Teshin's Steel Path Honors", value: teshin.item },
    ...(circuit
      ? [
          { task: "circuit", label: "The Circuit", value: circuit.normal.join(", ") },
          { task: "circuit-hard", label: "Circuit, Steel Path", value: circuit.steelPath.join(", ") },
        ]
      : []),
  ];
  const keys = rows.map((row) => weeklyKey(row.task, reset));
  const wareKeys = PALLADINO_WARES.map((ware) => weeklyKey(`ironwake:${ware.key}`, reset));
  const all = [...keys, ...wareKeys];

  return (
    <Panel
      title="Weekly"
      icon={CheckIcon}
      className={CLASS}
      count={`${all.length - remaining(all, done)} / ${all.length}`}
      action={<Countdown target={reset} now={now} verb="resets" />}
    >
      <ul className="divide-y divide-border">
        {rows.map((row, i) => (
          <CheckoffRow
            key={row.task}
            id={keys[i]}
            expiresAt={reset}
            label={`${row.label}, ${row.value}`}
          >
            <Lines label={row.label} value={row.value} />
          </CheckoffRow>
        ))}
        <IronWake reset={reset} keys={wareKeys} />
      </ul>
    </Panel>
  );
}
