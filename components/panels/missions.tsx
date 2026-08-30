"use client";

import { useState } from "react";

import { Segmented } from "@/components/segmented";
import type { ArchonHunt, Sortie } from "@/lib/contracts/worldstate";
import { LayoutGridIcon } from "@/components/icons/layout-grid";
import { cn } from "@/lib/utils";
import { Checkoff, doneRow, remaining, sortieKey, useCheckoffs } from "./checkoffs";
import { Empty, Panel } from "./panel";
import { Countdown } from "./countdown";
import { useNow } from "./use-now";

const CLASS = "md:col-span-2 lg:col-span-3";

// Sortie and Archon Hunt share a shape and a box, the toggle picks which one shows.
const SETS = [
  { value: "sortie", label: "Sortie" },
  { value: "archon", label: "Archon Hunt" },
] as const;
type Set = (typeof SETS)[number]["value"];

export function MissionSetPanel({
  sortie,
  archonHunt,
}: {
  sortie: Sortie | null;
  archonHunt: ArchonHunt | null;
}) {
  const now = useNow();
  const [set, setSet] = useState<Set>("sortie");
  const { done } = useCheckoffs();
  const data = set === "sortie" ? sortie : archonHunt;
  const toggle = <Segmented label="Mission set" options={SETS} value={set} onChange={setSet} />;
  const keys = data ? data.missions.map((m) => sortieKey(set, data.key, m.node)) : [];

  return (
    <Panel
      title={set === "sortie" ? "Sortie" : data?.boss ?? "Archon Hunt"}
      icon={LayoutGridIcon}
      className={CLASS}
      // The pill reads done over total, the same on every box with check offs.
      count={data ? `${keys.length - remaining(keys, done)} / ${keys.length}` : undefined}
      action={
        <span className="flex items-center gap-3">
          {data ? <Countdown target={data.expiresAt} now={now} /> : null}
          {toggle}
        </span>
      }
    >
      {!data ? (
        <Empty>Nothing active.</Empty>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {data.missions.map((m) => {
              const id = sortieKey(set, data.key, m.node);
              return (
                <li
                  key={m.node}
                  className={cn("flex items-center gap-2 py-2", done.has(id) && doneRow)}
                >
                  <Checkoff
                    id={id}
                    expiresAt={data.expiresAt}
                    label={`${m.missionType}, ${m.node}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate">
                      <span className="font-medium">{m.missionType}</span>{" "}
                      <span className="text-muted-foreground">{m.node}</span>
                    </p>
                    {m.modifier ? (
                      <p className="truncate text-xs text-muted-foreground">{m.modifier}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}
