"use client";

import type { Nightwave } from "@/lib/contracts/worldstate";
import { Badge } from "@/components/ui/badge";
import { Empty, Panel } from "./panel";
import { countdown } from "./format";
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
      action={
        <span className="text-muted-foreground text-xs tabular-nums">
          {countdown(nightwave.expiresAt, now)}
        </span>
      }
    >
      <ul className="max-h-56 space-y-1 overflow-y-auto">
        {nightwave.acts.map((a) => (
          <li key={a.key} className="flex items-center gap-2 py-0.5">
            <Badge variant={a.daily ? "outline" : "secondary"}>
              {a.daily ? "Daily" : "Weekly"}
            </Badge>
            <span className="truncate font-medium">{a.title}</span>
            <span className="text-muted-foreground ml-auto tabular-nums">
              {a.reputation} rep · {countdown(a.expiresAt, now)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
