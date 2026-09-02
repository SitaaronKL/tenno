"use client";

import type { WorldState } from "@/lib/contracts/worldstate";
import { useHidden } from "@/components/hidden";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorldState } from "./world-state";
import { useNow } from "./use-now";
import { Empty } from "./panel";
import { FissuresPanel } from "./fissures";
import { MissionSetPanel } from "./missions";
import { ArchimedeaPanel } from "./archimedea";
import { BaroPanel } from "./baro";
import { NightwavePanel } from "./nightwave";
import { EventsPanel } from "./events";
import { BountiesPanel, bountiesOf } from "./bounties";
import { IncursionsPanel } from "./incursions";
import { WeeklyPanel } from "./weekly";
import { CheckoffsProvider } from "./checkoffs-store";

// Bento: six columns on desktop, and each card claims the width its content needs.
// items-start so a short card stays short instead of stretching to its neighbour's height.
const GRID = "grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-6";

// Upstream can lag by hours, so a stale feed reads as stale rather than as a quiet game.
function StaleNotice({ state }: { state: WorldState }) {
  const now = useNow();
  const minutes = Math.max(
    1,
    Math.round((now - state.upstreamTimestamp) / 60_000),
  );
  return (
    <p
      role="status"
      className="mb-4 flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning ring-1 ring-warning/25"
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
      Data is {minutes} minutes old, upstream is lagging
      {state.source === "de" && ". Live from Digital Extremes"}
    </p>
  );
}

export function DashboardGrid() {
  const state = useWorldState();

  if (state === undefined) {
    return (
      <div>
        {/* The skeleton matches the final layout, tiles first, then the bento grid. */}
        <div className="mb-4 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-40 rounded-lg" />
          ))}
        </div>
        <div className={GRID}>
          <Skeleton className="h-72 w-full rounded-xl md:col-span-2 lg:col-span-6" />
          <Skeleton className="h-72 w-full rounded-xl md:col-span-2 lg:col-span-3" />
          <Skeleton className="h-56 w-full rounded-xl md:col-span-2 lg:col-span-3" />
          <Skeleton className="h-56 w-full rounded-xl md:col-span-2 lg:col-span-3" />
        </div>
      </div>
    );
  }

  if (state === null) {
    return (
      <Empty>
        World state has not been fetched yet. Check back in a few minutes.
      </Empty>
    );
  }

  // The provider lives here, so every panel below reads one set of ticks.
  return (
    <CheckoffsProvider>
      <Panels state={state} />
    </CheckoffsProvider>
  );
}

export function Panels({ state }: { state: WorldState }) {
  // A box the user turned off never renders, so it costs nothing to keep it in the grid.
  const hidden = useHidden();
  const shown = (key: string) => !hidden.has(key);

  return (
    <div>
      {state.stale && <StaleNotice state={state} />}
      {/* Fissures and bounties share the top row, 712px and 460px are where their text reads best. */}
      <div className="flex flex-wrap items-start gap-4">
        {shown("box.fissures") ? (
          <div className="w-full lg:w-[712px]">
            <FissuresPanel fissures={state.fissures} />
          </div>
        ) : null}
        {shown("box.bounties") ? (
          <div className="w-full lg:w-[460px]">
            <BountiesPanel bounties={bountiesOf(state)} />
          </div>
        ) : null}
      </div>
      {/* Two independent stacks, so an open box only pushes its own column down. */}
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {shown("box.missions") ? (
            <MissionSetPanel sortie={state.sortie} archonHunt={state.archonHunt} />
          ) : null}
          {shown("box.weekly") ? <WeeklyPanel circuit={state.circuit} /> : null}
          {shown("box.nightwave") ? <NightwavePanel nightwave={state.nightwave} /> : null}
        </div>
        <div className="flex flex-col gap-4">
          {shown("box.events") ? (
            <EventsPanel invasions={state.invasions} alerts={state.alerts} />
          ) : null}
          {shown("box.archimedea") ? <ArchimedeaPanel archimedea={state.archimedea ?? []} /> : null}
          {shown("box.incursions") ? <IncursionsPanel incursions={state.incursions ?? []} /> : null}
          {state.baro?.active && shown("box.baro") ? <BaroPanel baro={state.baro} /> : null}
        </div>
      </div>
    </div>
  );
}
