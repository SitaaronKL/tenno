"use client";

import { previewStats, type Catalog, type Slots } from "@/lib/builds/capacity";
import type { BuildItem } from "./types";
import { STAT_LABELS } from "./types";

const ORDER = [
  "health",
  "shield",
  "armor",
  "energy",
  "sprint",
  "strength",
  "duration",
  "efficiency",
  "range",
] as const;

// Frames only. A weapon's numbers need damage math this slice does not do.
export function StatPreview({
  item,
  slots,
  catalog,
}: {
  item: BuildItem | undefined;
  slots: Slots;
  catalog: Catalog;
}) {
  if (!item?.stats) {
    return (
      <p className="text-sm text-muted-foreground">
        A stat preview needs a warframe, weapons carry no comparable base stats.
      </p>
    );
  }
  const stats = previewStats(item.stats, slots, catalog);
  const ability = new Set(["strength", "duration", "efficiency", "range"]);

  return (
    <dl className="divide-y divide-border">
      {ORDER.map((key) => (
        <div key={key} className="flex items-center justify-between py-2">
          <dt className="text-sm text-muted-foreground">{STAT_LABELS[key]}</dt>
          <dd className="font-mono text-sm tabular-nums">
            {stats[key]}
            {ability.has(key) ? "%" : ""}
          </dd>
        </div>
      ))}
    </dl>
  );
}
