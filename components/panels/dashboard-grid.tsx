"use client";

import type { WorldState } from "@/lib/contracts/worldstate";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorldState } from "./world-state";
import { useNow } from "./use-now";
import { FissuresPanel } from "./fissures";
import { MissionSetPanel } from "./missions";
import { BaroPanel } from "./baro";
import { NightwavePanel } from "./nightwave";
import { CyclesPanel } from "./cycles";
import { InvasionsPanel } from "./invasions";
import { AlertsPanel } from "./alerts";

const GRID = "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3";

// Upstream can lag by hours, so a stale feed reads as stale rather than as a quiet game.
function StaleNotice({ state }: { state: WorldState }) {
  const now = useNow();
  const minutes = Math.max(1, Math.round((now - state.upstreamTimestamp) / 60_000));
  return (
    <p className="text-muted-foreground mb-3 text-sm">
      Data is {minutes} minutes old
      {state.source === "de" && ". Live from Digital Extremes"}
    </p>
  );
}

export function DashboardGrid() {
  const state = useWorldState();

  if (state === undefined) {
    return (
      <div className={GRID}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (state === null) {
    return (
      <p className="text-muted-foreground text-sm">
        World state has not been fetched yet. Check back in a few minutes.
      </p>
    );
  }

  return <Panels state={state} />;
}

export function Panels({ state }: { state: WorldState }) {
  return (
    <div>
      {state.stale && <StaleNotice state={state} />}
      <div className={GRID}>
        <FissuresPanel fissures={state.fissures} />
        <CyclesPanel cycles={state.cycles} />
        <MissionSetPanel title="Sortie" data={state.sortie} />
        <MissionSetPanel title="Archon Hunt" data={state.archonHunt} />
        <BaroPanel baro={state.baro} />
        <InvasionsPanel invasions={state.invasions} />
        <NightwavePanel nightwave={state.nightwave} />
        <AlertsPanel alerts={state.alerts} />
      </div>
    </div>
  );
}
