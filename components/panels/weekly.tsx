"use client";

import { CheckIcon } from "@/components/icons/check";
import type { Circuit, DarvoDeal } from "@/lib/contracts/worldstate";
import { teshinOffering } from "@/lib/teshin";
import { CheckoffRow, remaining, useCheckoffs, weeklyKey } from "./checkoffs";
import { Countdown } from "./countdown";
import { nextWeeklyReset } from "./cycles";
import { Panel } from "./panel";
import { useNow } from "./use-now";

const CLASS = "md:col-span-1 lg:col-span-2";

function Lines({ label, value }: { label: string; value: string }) {
  return (
    <>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="truncate">{value}</p>
    </>
  );
}

// The weekly chores that are not missions: Teshin's offer, both Circuit pools, Palladino's trade,
// plus Darvo's deal, which is daily and so carries no tick.
export function WeeklyPanel({
  circuit,
  darvo,
}: {
  circuit?: Circuit | null;
  darvo?: DarvoDeal | null;
}) {
  const now = useNow();
  const { done } = useCheckoffs();
  const reset = nextWeeklyReset(now);
  const teshin = teshinOffering(now);

  const rows = [
    { task: "teshin", label: "Steel Path Honors", value: teshin.item },
    { task: "ironwake", label: "Iron Wake", value: "Riven Sliver trade" },
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
        {/* Darvo's deal is daily and it is a purchase, not a chore, so it carries no box. */}
        {darvo ? (
          <li className="flex items-center gap-2 py-2">
            <span aria-hidden="true" className="size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <Lines
                label="Darvo's deal"
                value={`${darvo.item}, ${darvo.discount}% off, ${darvo.stock} left`}
              />
            </div>
            <Countdown target={darvo.expiresAt} now={now} />
          </li>
        ) : null}
      </ul>
    </Panel>
  );
}
