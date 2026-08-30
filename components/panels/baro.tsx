"use client";

import type { Baro } from "@/lib/contracts/worldstate";
import { TimerIcon } from "@/components/icons/timer";
import { Empty, Panel } from "./panel";
import { countdown, spoken } from "./format";
import { Countdown } from "./countdown";
import { TruncatedCell } from "@/components/ui/data-table";
import { useNow } from "./use-now";

const CLASS = "md:col-span-1 lg:col-span-2";

export function BaroPanel({ baro }: { baro: Baro | null }) {
  const now = useNow();
  if (!baro) {
    return (
      <Panel title="Baro Ki'Teer" icon={TimerIcon} className={CLASS}>
        <Empty>No arrival scheduled.</Empty>
      </Panel>
    );
  }

  if (!baro.active) {
    return (
      <Panel title="Baro Ki'Teer" icon={TimerIcon} className={CLASS}>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="font-mono text-3xl tabular-nums" aria-hidden="true">
            {countdown(baro.startsAt, now)}
          </p>
          <p className="sr-only">Arrives in {spoken(baro.startsAt, now)}</p>
          <p className="mt-2 text-sm text-muted-foreground">until {baro.location}</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Baro Ki'Teer"
      icon={TimerIcon}
      className={CLASS}
      count={baro.inventory.length || undefined}
      action={<Countdown target={baro.expiresAt} now={now} verb="leaves" />}
    >
      <p className="mb-2 font-medium">{baro.location}</p>
      {baro.inventory.length === 0 ? (
        <Empty>Inventory not listed yet.</Empty>
      ) : (
        <ul className="max-h-56 divide-y divide-border overflow-y-auto">
          {baro.inventory.map((i) => (
            <li key={i.item} className="flex items-center gap-2 py-2">
              <TruncatedCell text={i.item} className="min-w-0 flex-1" />
              <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {i.ducats} ducats · {i.credits.toLocaleString()} cr
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
