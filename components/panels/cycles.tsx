"use client";

import { Globe, Orbit, Skull, Snowflake, Sun, Swords } from "lucide-react";
import type { Cycle } from "@/lib/contracts/worldstate";
import { cn } from "@/lib/utils";
import { Countdown, SOON_MS } from "./countdown";
import { useNow } from "./use-now";

const WORLDS: Record<Cycle["world"], { label: string; icon: typeof Sun }> = {
  cetus: { label: "Cetus", icon: Sun },
  vallis: { label: "Orb Vallis", icon: Snowflake },
  cambion: { label: "Cambion Drift", icon: Skull },
  earth: { label: "Earth", icon: Globe },
  duviri: { label: "Duviri", icon: Swords },
  zariman: { label: "Zariman", icon: Orbit },
};

export function CycleTiles({ cycles }: { cycles: Cycle[] }) {
  const now = useNow();
  const order = Object.keys(WORLDS) as Cycle["world"][];
  const rows = order
    .map((w) => cycles.find((c) => c.world === w))
    .filter((c): c is Cycle => Boolean(c));

  if (rows.length === 0) return null;

  return (
    <ul aria-label="World cycles" className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {rows.map((c) => {
        const Icon = WORLDS[c.world].icon;
        const soon = c.expiresAt - now <= SOON_MS;
        return (
          <li
            key={c.world}
            className={cn(
              "rounded-xl bg-card p-3 ring-1 transition-colors duration-150 ease-out",
              soon ? "ring-primary/40" : "ring-foreground/10",
            )}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="size-3.5" aria-hidden="true" />
              <span className="truncate text-xs">{WORLDS[c.world].label}</span>
            </div>
            <p className="mt-2 text-sm font-medium capitalize">{c.state}</p>
            <Countdown target={c.expiresAt} now={now} verb="changes" className="mt-0.5 block" />
          </li>
        );
      })}
    </ul>
  );
}
