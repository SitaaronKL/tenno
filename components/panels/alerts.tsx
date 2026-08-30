"use client";

import type { Alert } from "@/lib/contracts/worldstate";
import { Empty, Panel } from "./panel";
import { Countdown } from "./countdown";
import { useNow } from "./use-now";

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const now = useNow();
  // The query already drops expired rows, this keeps the list honest between polls.
  const open = alerts.filter((a) => a.expiresAt > now);
  return (
    <Panel title="Alerts" count={open.length}>
      {open.length === 0 ? (
        <Empty>No alerts running.</Empty>
      ) : (
        <ul className="divide-y divide-border">
          {open.map((a) => (
            <li key={a.key} className="flex items-center gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate">
                  <span className="font-medium">{a.missionType}</span>{" "}
                  <span className="text-muted-foreground">
                    {a.node} · {a.enemy}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.rewards.map((r) => r.item || `${r.credits} cr`).join(", ")}
                </p>
              </div>
              <Countdown target={a.expiresAt} now={now} className="ml-auto" />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
