"use client";

import { useState } from "react";
import type { Fissure } from "@/lib/contracts/worldstate";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, Panel } from "./panel";
import { countdown } from "./format";
import { useNow } from "./use-now";

const TIERS = ["Lith", "Meso", "Neo", "Axi", "Requiem", "Omnia"] as const;

export function FissuresPanel({ fissures }: { fissures: Fissure[] }) {
  const now = useNow();
  const [tier, setTier] = useState<string>("All");
  const [steelPath, setSteelPath] = useState(false);

  const rows = fissures
    .filter((f) => f.steelPath === steelPath)
    .filter((f) => tier === "All" || f.tier === tier)
    .sort((a, b) => a.expiresAt - b.expiresAt);

  return (
    <Panel
      title="Fissures"
      className="lg:col-span-2"
      action={
        <div className="flex items-center gap-2">
          <Label htmlFor="steel-path" className="text-xs font-normal">
            Steel Path
          </Label>
          <Switch id="steel-path" checked={steelPath} onCheckedChange={setSteelPath} />
        </div>
      }
    >
      <Tabs value={tier} onValueChange={setTier}>
        <TabsList className="mb-3 h-7">
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
        <ul className="divide-border divide-y">
          {rows.map((f) => (
            <li key={f.key} className="flex items-center gap-2 py-1.5">
              <Badge variant="secondary" className="w-16 justify-center">
                {f.tier}
              </Badge>
              <span className="font-medium">{f.missionType}</span>
              <span className="text-muted-foreground truncate">
                {f.node} · {f.enemy}
              </span>
              {f.storm ? <Badge variant="outline">Void Storm</Badge> : null}
              <span className="text-muted-foreground ml-auto tabular-nums">
                {countdown(f.expiresAt, now)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
