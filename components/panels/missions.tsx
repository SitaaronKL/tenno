"use client";

import type { ArchonHunt, Sortie } from "@/lib/contracts/worldstate";
import { Chip } from "./tier-badge";
import { Empty, Panel } from "./panel";
import { Countdown } from "./countdown";
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
    <Panel title={title} action={<Countdown target={data.expiresAt} now={now} />}>
      <div className="mb-2 flex items-center gap-2">
        <span className="truncate font-medium">{data.boss}</span>
        <Chip>{data.faction}</Chip>
      </div>
      <ul className="divide-y divide-border">
        {data.missions.map((m) => (
          <li key={m.node} className="flex items-center gap-2 py-2">
            <div className="min-w-0">
              <p className="truncate">
                <span className="font-medium">{m.missionType}</span>{" "}
                <span className="text-muted-foreground">{m.node}</span>
              </p>
              <p className="truncate text-xs text-muted-foreground">{m.modifier}</p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
