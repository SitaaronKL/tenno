"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { slotCost, type ModDef, type ModRef, type Polarity } from "@/lib/builds/capacity";
import { POLARITY_SYMBOL } from "./types";

export type SlotView = {
  key: string;
  label: string;
  ref: ModRef | null;
  polarity: Polarity | null;
};

// One slot: what is in it, what it costs here, its rank, and whether forma has polarised it.
export function Slot({
  view,
  mod,
  onOpen,
  onRank,
  onForma,
}: {
  view: SlotView;
  mod: ModDef | undefined;
  onOpen: () => void;
  onRank: (rank: number) => void;
  onForma: () => void;
}) {
  const cost = mod && view.ref ? slotCost(mod, view.ref.rank, view.polarity) : 0;

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs tracking-wide text-muted-foreground uppercase">{view.label}</span>
        <span className="font-mono text-xs" aria-label={`Slot polarity ${view.polarity ?? "none"}`}>
          {view.polarity ? POLARITY_SYMBOL[view.polarity] : "·"}
        </span>
      </div>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${view.label} slot`}
        className={cn(
          "mt-2 block w-full truncate text-left text-sm font-medium",
          !mod && "text-muted-foreground",
        )}
      >
        {mod ? mod.name : "Empty"}
      </button>
      {mod && view.ref ? (
        <>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={mod.fusionLimit}
              value={view.ref.rank}
              onChange={(event) => onRank(Number(event.target.value))}
              aria-label={`${mod.name} rank`}
              className="h-1 flex-1 accent-foreground"
            />
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {view.ref.rank}/{mod.fusionLimit}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <Button variant="ghost" size="xs" onClick={onForma}>
              {view.polarity ? "Remove forma" : "Forma"}
            </Button>
            <span className="font-mono text-sm tabular-nums">{cost}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
