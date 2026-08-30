"use client";

import type { ArchonHunt, Sortie } from "@/lib/contracts/worldstate";
import { Badge } from "@/components/ui/badge";
import { Empty, Panel } from "./panel";
import { countdown } from "./format";
import { useNow } from "./use-now";

export function MissionSetPanel({
  title,
  data,
}: {
  title: string;
  data: Sortie | ArchonHunt | null;
}) {
  const now = useNow();
  if (!data) {
    return (
      <Panel title={title}>
        <Empty>Nothing active.</Empty>
      </Panel>
    );
  }
  return (
    <Panel
      title={title}
      action={
        <span className="text-muted-foreground text-xs tabular-nums">
          {countdown(data.expiresAt, now)}
        </span>
      }
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="font-medium">{data.boss}</span>
        <Badge variant="secondary">{data.faction}</Badge>
      </div>
      <ul className="space-y-1">
        {data.missions.map((m) => (
          <li key={m.node} className="flex items-center gap-2">
            <span className="font-medium">{m.missionType}</span>
            <span className="text-muted-foreground truncate">{m.node}</span>
            <span className="text-muted-foreground ml-auto truncate text-xs">
              {m.modifier}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
