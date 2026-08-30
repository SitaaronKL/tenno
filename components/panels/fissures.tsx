"use client";

import { useState } from "react";
import type { Fissure } from "@/lib/contracts/worldstate";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, Panel } from "./panel";
import { Chip, TierBadge, TIERS } from "./tier-badge";
import { Countdown } from "./countdown";
import { useNow } from "./use-now";

export function FissuresPanel({ fissures }: { fissures: Fissure[] }) {
  const now = useNow();
  const [tier, setTier] = useState<string>("All");
  const [steelPath, setSteelPath] = useState(false);

  // The query already drops expired rows, this keeps the list honest between polls.
  const rows = fissures
    .filter((f) => f.expiresAt > now)
    .filter((f) => f.steelPath === steelPath)
    .filter((f) => tier === "All" || f.tier === tier)
    .sort((a, b) => a.expiresAt - b.expiresAt);

  return (
    <Panel
      title="Fissures"
      count={rows.length}
      className="lg:col-span-2"
      action={
        <div className="flex items-center gap-2">
          <Label htmlFor="steel-path" className="text-xs font-normal text-muted-foreground">
            Steel Path
          </Label>
          <Switch id="steel-path" size="sm" checked={steelPath} onCheckedChange={setSteelPath} />
        </div>
      }
    >
      <Tabs value={tier} onValueChange={setTier}>
        <TabsList variant="line" className="mb-1 h-7">
          {["All", ...TIERS].map((t) => (
            <TabsTrigger key={t} value={t} className="px-2 text-xs">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {rows.length === 0 ? (
        <Empty>No fissures open.</Empty>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((f) => (
            <li key={f.key} className="flex items-center gap-2 py-2">
              <TierBadge tier={f.tier} />
              <span className="shrink-0 font-medium">{f.missionType}</span>
              <span className="truncate text-muted-foreground">
                {f.node} · {f.enemy}
              </span>
              {f.steelPath ? <Chip>Steel Path</Chip> : null}
              {f.storm ? <Chip>Void Storm</Chip> : null}
              <Countdown target={f.expiresAt} now={now} className="ml-auto" />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
