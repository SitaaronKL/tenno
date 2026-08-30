"use client";

import { useRef } from "react";
import { SunIcon } from "@/components/icons/sun";
import { SnowflakeIcon } from "@/components/icons/snowflake";
import { BoneIcon } from "@/components/icons/bone";
import { EarthIcon } from "@/components/icons/earth";
import { TornadoIcon } from "@/components/icons/tornado";
import { AtomIcon } from "@/components/icons/atom";
import { TimerIcon } from "@/components/icons/timer";
import type { Baro, Cycle } from "@/lib/contracts/worldstate";
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

function Tile({
  icon: Icon,
  label,
  state,
  expiresAt,
  now,
  verb = "changes",
}: {
  icon: PanelIcon;
  label: string;
  state: string;
  expiresAt: number;
  now: number;
  verb?: string;
}) {
  const icon = useRef<IconHandle>(null);
  const soon = expiresAt - now <= SOON_MS;
  return (
    <li
      onMouseEnter={() => icon.current?.startAnimation()}
      onMouseLeave={() => icon.current?.stopAnimation()}
      className={cn(
        "flex items-center gap-1.5 rounded-md bg-card px-2 py-1 ring-1 transition-shadow duration-150 ease-out hover:ring-foreground",
        soon ? "ring-foreground/40" : "ring-foreground/10",
      )}
    >
      <Icon ref={icon} size={14} className="shrink-0 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium capitalize">{state}</span>
      <Countdown target={expiresAt} now={now} verb={verb} />
    </li>
  );
}

// Daily reset is 00:00 UTC, weekly is Monday 00:00 UTC, both are fixed by the game.
export function nextDailyReset(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}
export function nextWeeklyReset(now: number): number {
  const d = new Date(now);
  const daysToMonday = ((8 - d.getUTCDay()) % 7) || 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysToMonday);
}

export function CycleTiles({ cycles, baro }: { cycles: Cycle[]; baro?: Baro | null }) {
  const now = useNow();
  const order = Object.keys(WORLDS) as Cycle["world"][];
  const rows = order
    .map((w) => cycles.find((c) => c.world === w))
    .filter((c): c is Cycle => Boolean(c));

  if (rows.length === 0) return null;

  return (
    <ul aria-label="World cycles" className="ml-auto grid shrink-0 grid-cols-[repeat(3,max-content)] gap-1.5 lg:mr-24">
      {baro ? (
        <Tile
          icon={TimerIcon}
          label="Baro"
          state={baro.active ? "here" : "away"}
          expiresAt={baro.active ? baro.expiresAt : baro.startsAt}
          now={now}
          verb={baro.active ? "leaves" : "arrives"}
        />
      ) : null}
      <Tile icon={TimerIcon} label="Daily reset" state="" expiresAt={nextDailyReset(now)} now={now} verb="resets" />
      <Tile icon={TimerIcon} label="Weekly reset" state="" expiresAt={nextWeeklyReset(now)} now={now} verb="resets" />
      {rows.map((c) => (
        <Tile
          key={c.world}
          icon={WORLDS[c.world].icon}
          label={WORLDS[c.world].label}
          state={c.state}
          expiresAt={c.expiresAt}
          now={now}
        />
      ))}
    </ul>
  );
}

// The tiles sit beside the page title, so they fetch on their own instead of through the grid.
export function CycleTilesLive() {
  const state = useQuery(api.worldstate.get, { platform: "pc" });
  if (!state) return null;
  return <CycleTiles cycles={state.cycles} baro={state.baro} />;
}
