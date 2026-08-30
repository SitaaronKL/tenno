"use client";

import type { Alert } from "@/lib/contracts/worldstate";
import { Empty, Panel } from "./panel";
import { countdown } from "./format";
import { useNow } from "./use-now";

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const now = useNow();
  return (
    <Panel title="Alerts">
      {alerts.length === 0 ? (
        <Empty>No alerts running.</Empty>
      ) : (
        <ul className="space-y-1">
          {alerts.map((a) => (
            <li key={a.key} className="flex items-center gap-2">
              <span className="font-medium">{a.missionType}</span>
              <span className="text-muted-foreground truncate">
                {a.node} · {a.enemy}
              </span>
              <span className="truncate text-xs">
                {a.rewards.map((r) => r.item || `${r.credits} cr`).join(", ")}
              </span>
              <span className="text-muted-foreground ml-auto tabular-nums">
                {countdown(a.expiresAt, now)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
