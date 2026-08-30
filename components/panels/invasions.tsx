"use client";

import type { Invasion, Reward } from "@/lib/contracts/worldstate";
import { Empty, Panel } from "./panel";

function rewardText(r: Reward | null): string {
  if (!r) return "No reward";
  if (r.item) return r.count > 1 ? `${r.item} x${r.count}` : r.item;
  return `${r.credits.toLocaleString()} credits`;
}

export function InvasionsPanel({ invasions }: { invasions: Invasion[] }) {
  return (
    <Panel title="Invasions" className="lg:col-span-2">
      {invasions.length === 0 ? (
        <Empty>No invasions running.</Empty>
      ) : (
        <ul className="space-y-2">
          {invasions.map((i) => {
            const attacker = Math.min(100, Math.max(0, i.completion));
            return (
              <li key={i.key} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{i.node}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {i.description}
                  </span>
                  <span className="text-muted-foreground ml-auto tabular-nums">
                    {attacker.toFixed(0)}%
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${i.node} attacker progress`}
                  aria-valuenow={Math.round(attacker)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
                >
                  <div className="bg-primary h-full" style={{ width: `${attacker}%` }} />
                </div>
                <div className="text-muted-foreground flex items-center justify-between text-xs">
                  <span>
                    {i.attacker.faction}: {rewardText(i.attacker.reward)}
                  </span>
                  <span>
                    {i.defender.faction}: {rewardText(i.defender.reward)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
