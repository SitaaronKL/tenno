"use client";

import type { Baro } from "@/lib/contracts/worldstate";
import { Empty, Panel } from "./panel";
import { countdown } from "./format";
import { useNow } from "./use-now";

export function BaroPanel({ baro }: { baro: Baro | null }) {
  const now = useNow();
  if (!baro) {
    return (
      <Panel title="Baro Ki'Teer">
        <Empty>No arrival scheduled.</Empty>
      </Panel>
    );
  }
  return (
    <Panel
      title="Baro Ki'Teer"
      action={
        <span className="text-muted-foreground text-xs tabular-nums">
          {baro.active
            ? `leaves in ${countdown(baro.expiresAt, now)}`
            : `arrives in ${countdown(baro.startsAt, now)}`}
        </span>
      }
    >
      <p className="mb-2 font-medium">{baro.location}</p>
      {baro.active ? (
        baro.inventory.length === 0 ? (
          <Empty>Inventory not listed yet.</Empty>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {baro.inventory.map((i) => (
              <li key={i.item} className="flex items-center gap-2">
                <span className="truncate">{i.item}</span>
                <span className="text-muted-foreground ml-auto tabular-nums">
                  {i.ducats} ducats · {i.credits.toLocaleString()} cr
                </span>
              </li>
            ))}
          </ul>
        )
      ) : (
        <Empty>Inventory shows when he arrives.</Empty>
      )}
    </Panel>
  );
}
