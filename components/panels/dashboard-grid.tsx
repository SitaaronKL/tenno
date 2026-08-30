"use client";

import type { WorldState } from "@/lib/contracts/worldstate";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorldState } from "./world-state";
import { useNow } from "./use-now";
import { Empty } from "./panel";
import { FissuresPanel } from "./fissures";
import { MissionSetPanel } from "./missions";
import { BaroPanel } from "./baro";
import { NightwavePanel } from "./nightwave";
import { CycleTiles } from "./cycles";
import { InvasionsPanel } from "./invasions";
import { AlertsPanel } from "./alerts";

const GRID = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3";

// Upstream can lag by hours, so a stale feed reads as stale rather than as a quiet game.
function StaleNotice({ state }: { state: WorldState }) {
  const now = useNow();
  const minutes = Math.max(1, Math.round((now - state.upstreamTimestamp) / 60_000));
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
        {/* The skeleton matches the final layout, tiles first, then the grid. */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className={GRID}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (state === null) {
    return <Empty>World state has not been fetched yet. Check back in a few minutes.</Empty>;
  }

  return <Panels state={state} />;
}

export function Panels({ state }: { state: WorldState }) {
  return (
    <div>
      <CycleTiles cycles={state.cycles} />
      {state.stale && <StaleNotice state={state} />}
      <div className={GRID}>
        <FissuresPanel fissures={state.fissures} />
        <MissionSetPanel title="Sortie" data={state.sortie} />
        <InvasionsPanel invasions={state.invasions} />
        <MissionSetPanel title="Archon Hunt" data={state.archonHunt} />
        <BaroPanel baro={state.baro} />
        <NightwavePanel nightwave={state.nightwave} />
        <AlertsPanel alerts={state.alerts} />
      </div>
    </div>
  );
}
