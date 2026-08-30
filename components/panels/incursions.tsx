"use client";

import { GripHorizontalIcon } from "@/components/icons/grip-horizontal";
import { CheckoffRow, incursionKey, remaining, useCheckoffs } from "./checkoffs";
import { Countdown } from "./countdown";
import { nextDailyReset } from "./cycles";
import { Empty, Panel } from "./panel";
import { useNow } from "./use-now";

const CLASS = "md:col-span-2 lg:col-span-3";

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
      title="Steel Path Incursions"
      icon={GripHorizontalIcon}
      className={CLASS}
      count={incursions.length ? `${keys.length - remaining(keys, done)} / ${keys.length}` : undefined}
      action={incursions.length ? <Countdown target={resetsAt} now={now} verb="resets" /> : null}
    >
      {incursions.length === 0 ? (
        <Empty>The incursion schedule does not reach today.</Empty>
      ) : (
        <ul className="divide-y divide-border">
          {incursions.map((node, i) => (
            <CheckoffRow key={keys[i]} id={keys[i]} expiresAt={resetsAt} label={node}>
              <p className="truncate">{node}</p>
            </CheckoffRow>
          ))}
        </ul>
      )}
    </Panel>
  );
}
