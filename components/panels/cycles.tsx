"use client";

import { SunIcon } from "@/components/icons/sun";
import { SnowflakeIcon } from "@/components/icons/snowflake";
import { BoneIcon } from "@/components/icons/bone";
import { EarthIcon } from "@/components/icons/earth";
import { TornadoIcon } from "@/components/icons/tornado";
import { AtomIcon } from "@/components/icons/atom";
import type { Cycle } from "@/lib/contracts/worldstate";
import { cn } from "@/lib/utils";
import { Countdown, SOON_MS } from "./countdown";
import { useNow } from "./use-now";

const WORLDS: Record<Cycle["world"], { label: string; icon: typeof SunIcon }> = {
  cetus: { label: "Cetus", icon: SunIcon },
  vallis: { label: "Orb Vallis", icon: SnowflakeIcon },
  cambion: { label: "Cambion Drift", icon: BoneIcon },
  earth: { label: "Earth", icon: EarthIcon },
  duviri: { label: "Duviri", icon: TornadoIcon },
  zariman: { label: "Zariman", icon: AtomIcon },
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
              <Icon size={14} aria-hidden="true" />
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
