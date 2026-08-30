"use client";

import type { Nightwave } from "@/lib/contracts/worldstate";
import { Chip } from "./tier-badge";
import { Empty, Panel } from "./panel";
import { Countdown } from "./countdown";
import { useNow } from "./use-now";

export function NightwavePanel({ nightwave }: { nightwave: Nightwave | null }) {
  const now = useNow();
  if (!nightwave || nightwave.acts.length === 0) {
    return (
      <Panel title="Nightwave">
        <Empty>No acts available.</Empty>
      </Panel>
    );
  }
  return (
    <Panel
      title={`Nightwave season ${nightwave.season}`}
      count={nightwave.acts.length}
      action={<Countdown target={nightwave.expiresAt} now={now} />}
    >
      <ul className="max-h-56 divide-y divide-border overflow-y-auto">
        {nightwave.acts.map((a) => (
          <li key={a.key} className="flex items-center gap-2 py-2">
            <Chip>{a.daily ? "Daily" : "Weekly"}</Chip>
            <span className="truncate font-medium">{a.title}</span>
            <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {a.reputation} rep
            </span>
            <Countdown target={a.expiresAt} now={now} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}
