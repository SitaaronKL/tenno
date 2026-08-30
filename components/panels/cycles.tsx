"use client";

import type { Cycle } from "@/lib/contracts/worldstate";
import { Badge } from "@/components/ui/badge";
import { Empty, Panel } from "./panel";
import { countdown } from "./format";
import { useNow } from "./use-now";

const WORLDS: Record<Cycle["world"], string> = {
  cetus: "Cetus",
  vallis: "Orb Vallis",
  cambion: "Cambion Drift",
  earth: "Earth",
  duviri: "Duviri",
  zariman: "Zariman",
};

export function CyclesPanel({ cycles }: { cycles: Cycle[] }) {
  const now = useNow();
  const order = Object.keys(WORLDS) as Cycle["world"][];
  const rows = order
    .map((w) => cycles.find((c) => c.world === w))
    .filter((c): c is Cycle => Boolean(c));

  return (
    <Panel title="Cycles">
      {rows.length === 0 ? (
        <Empty>No cycle data.</Empty>
      ) : (
        <ul className="space-y-1">
          {rows.map((c) => (
            <li key={c.world} className="flex items-center gap-2">
              <span className="font-medium">{WORLDS[c.world]}</span>
              <Badge variant="secondary" className="capitalize">
                {c.state}
              </Badge>
              <span className="text-muted-foreground ml-auto tabular-nums">
                {countdown(c.expiresAt, now)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
