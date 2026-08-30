"use client";

import { useState } from "react";

import { Segmented } from "@/components/segmented";
import type { Alert, Invasion } from "@/lib/contracts/worldstate";
import { TornadoIcon } from "@/components/icons/tornado";
import { DataTable } from "@/components/ui/data-table";
import { Empty, Panel } from "./panel";
import { useNow } from "./use-now";
import { invasionColumns, invasionWidths } from "./invasions";
import { alertColumns, alertWidths } from "./alerts";

// Invasions and alerts are both "go here for this reward" lists, so they share a box.
const KINDS = [
  { value: "invasions", label: "Invasions" },
  { value: "alerts", label: "Alerts" },
] as const;
type Kind = (typeof KINDS)[number]["value"];

export function EventsPanel({ invasions, alerts }: { invasions: Invasion[]; alerts: Alert[] }) {
  const now = useNow();
  const [kind, setKind] = useState<Kind>("invasions");
  const openAlerts = alerts.filter((a) => a.expiresAt > now).sort((a, b) => a.expiresAt - b.expiresAt);
  const count = kind === "invasions" ? invasions.length : openAlerts.length;

  return (
    <Panel
      id="events"
      title={kind === "invasions" ? "Invasions" : "Alerts"}
      icon={TornadoIcon}
      count={count}
      className="md:col-span-2 lg:col-span-3"
      action={<Segmented label="Event kind" options={KINDS} value={kind} onChange={setKind} />}
    >
      {kind === "invasions" ? (
        <DataTable
          dense
          label="Invasions"
          columns={invasionColumns}
          data={invasions}
          widths={invasionWidths}
          empty={<Empty>No invasions running.</Empty>}
        />
      ) : (
        <DataTable
          dense
          label="Alerts"
          columns={alertColumns}
          data={openAlerts}
          widths={alertWidths}
          empty={<Empty>No alerts running.</Empty>}
        />
      )}
    </Panel>
  );
}
