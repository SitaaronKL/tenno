"use client";

import { CheckIcon } from "@/components/icons/check";
import type { Circuit } from "@/lib/contracts/worldstate";
import { teshinOffering } from "@/lib/teshin";
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
    { task: "ironwake", label: "Palladino's Iron Wake", value: "10 Riven Slivers for a veiled Riven" },
    ...(circuit
      ? [
          { task: "circuit", label: "The Circuit", value: circuit.normal.join(", ") },
          { task: "circuit-hard", label: "Circuit, Steel Path", value: circuit.steelPath.join(", ") },
        ]
      : []),
  ];
  const keys = rows.map((row) => weeklyKey(row.task, reset));

  return (
    <Panel
      title="Weekly"
      icon={CheckIcon}
      className={CLASS}
      count={`${keys.length - remaining(keys, done)} / ${keys.length}`}
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
      </ul>
    </Panel>
  );
}
