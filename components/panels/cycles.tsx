"use client";

import { useRef } from "react";
import { SunIcon } from "@/components/icons/sun";
import { SnowflakeIcon } from "@/components/icons/snowflake";
import { BoneIcon } from "@/components/icons/bone";
import { EarthIcon } from "@/components/icons/earth";
import { TornadoIcon } from "@/components/icons/tornado";
import { AtomIcon } from "@/components/icons/atom";
import type { Cycle } from "@/lib/contracts/worldstate";
import { cn } from "@/lib/utils";
import { Countdown, SOON_MS } from "./countdown";
import type { IconHandle, PanelIcon } from "./panel";
import { useNow } from "./use-now";

const WORLDS: Record<Cycle["world"], { label: string; icon: PanelIcon }> = {
  cetus: { label: "Cetus", icon: SunIcon },
  vallis: { label: "Orb Vallis", icon: SnowflakeIcon },
  cambion: { label: "Cambion Drift", icon: BoneIcon },
  earth: { label: "Earth", icon: EarthIcon },
  duviri: { label: "Duviri", icon: TornadoIcon },
  zariman: { label: "Zariman", icon: AtomIcon },
};

function CycleTile({ cycle, now }: { cycle: Cycle; now: number }) {
  const icon = useRef<IconHandle>(null);
  const { label, icon: Icon } = WORLDS[cycle.world];
  const soon = cycle.expiresAt - now <= SOON_MS;
  return (
    <li
      onMouseEnter={() => icon.current?.startAnimation()}
      onMouseLeave={() => icon.current?.stopAnimation()}
      className={cn(
        "rounded-xl bg-card p-3 ring-1 transition-shadow duration-150 ease-out hover:ring-foreground",
        soon ? "ring-foreground/40" : "ring-foreground/10",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon ref={icon} size={14} />
        <span className="truncate text-xs">{label}</span>
      </div>
      <p className="mt-2 text-sm font-medium capitalize">{cycle.state}</p>
      <Countdown target={cycle.expiresAt} now={now} verb="changes" className="mt-0.5 block" />
    </li>
  );
}

export function CycleTiles({ cycles }: { cycles: Cycle[] }) {
  const now = useNow();
  const order = Object.keys(WORLDS) as Cycle["world"][];
  const rows = order
    .map((w) => cycles.find((c) => c.world === w))
    .filter((c): c is Cycle => Boolean(c));

  if (rows.length === 0) return null;

  return (
    <ul aria-label="World cycles" className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {rows.map((c) => (
        <CycleTile key={c.world} cycle={c} now={now} />
      ))}
    </ul>
  );
}
