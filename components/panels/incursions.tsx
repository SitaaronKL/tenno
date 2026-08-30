"use client";

import { GripHorizontalIcon } from "@/components/icons/grip-horizontal";
import { cn } from "@/lib/utils";
import { Checkoff, doneRow, incursionKey, remaining, useCheckoffs } from "./checkoffs";
import { Countdown } from "./countdown";
import { nextDailyReset } from "./cycles";
import { Empty, Panel } from "./panel";
import { useNow } from "./use-now";

const CLASS = "md:col-span-1 lg:col-span-2";

// Six Steel Path nodes a day, from the schedule browse.wf publishes. The file lists nodes only,
// so there is no mission type to print beside them.
export function IncursionsPanel({ incursions }: { incursions: string[] }) {
  const now = useNow();
  const { done } = useCheckoffs();
  const day = Math.floor(now / 86_400_000);
  const resetsAt = nextDailyReset(now);
  const keys = incursions.map((node) => incursionKey(day, node));

  return (
    <Panel
      title="Incursions"
      icon={GripHorizontalIcon}
      className={CLASS}
      count={incursions.length ? `${keys.length - remaining(keys, done)} / ${keys.length}` : undefined}
      action={incursions.length ? <Countdown target={resetsAt} now={now} verb="resets" /> : null}
    >
      {incursions.length === 0 ? (
        <Empty>The incursion schedule does not reach today.</Empty>
      ) : (
        <ul className="divide-y divide-border">
          {incursions.map((node, i) => {
            const id = keys[i];
            return (
              <li
                key={id}
                className={cn("flex items-center gap-2 py-2", done.has(id) && doneRow)}
              >
                <Checkoff id={id} expiresAt={resetsAt} label={node} />
                <span className="truncate">{node}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
