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
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
        "flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5 ring-1 transition-shadow duration-150 ease-out hover:ring-foreground",
        soon ? "ring-foreground/40" : "ring-foreground/10",
      )}
    >
      <Icon ref={icon} size={14} className="shrink-0 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium capitalize">{cycle.state}</span>
      <Countdown target={cycle.expiresAt} now={now} verb="changes" />
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
    <ul aria-label="World cycles" className="grid grid-cols-3 gap-2">
      {rows.map((c) => (
        <CycleTile key={c.world} cycle={c} now={now} />
      ))}
    </ul>
  );
}

// The tiles sit beside the page title, so they fetch on their own instead of through the grid.
export function CycleTilesLive() {
  const state = useQuery(api.worldstate.get, { platform: "pc" });
  if (!state) return null;
  return <CycleTiles cycles={state.cycles} />;
}
