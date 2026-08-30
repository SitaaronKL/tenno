"use client";

import type { GameEvent } from "@/lib/contracts/worldstate";
import { Countdown } from "./countdown";
import { useNow } from "./use-now";

// DE's Goals are the running events and tactical alerts. One quiet line above the grid, names only.
export function ActiveEvents({ events }: { events: GameEvent[] }) {
  const now = useNow();
  const running = events.filter((e) => e.expiresAt > now);
  if (running.length === 0) return null;

  return (
    <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      {running.map((event) => (
        <span key={event.key} className="flex items-center gap-2">
          {event.name}
          <Countdown target={event.expiresAt} now={now} verb="ends" />
        </span>
      ))}
    </p>
  );
}
