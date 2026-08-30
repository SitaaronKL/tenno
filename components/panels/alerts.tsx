"use client";

import { createColumnHelper } from "@tanstack/react-table";
import type { Alert } from "@/lib/contracts/worldstate";
import { BellIcon } from "@/components/icons/bell";
import { Empty, Panel } from "./panel";
import { Countdown } from "./countdown";
import { useNow } from "./use-now";
import { DataTable, SortableHeader, TruncatedCell, type DataTableFeatures } from "./data-table";

export function alertRewards(a: Alert): string {
  const text = a.rewards.map((r) => r.item || `${r.credits.toLocaleString()} cr`).join(", ");
  return text || "No reward";
}

function ExpiryCell({ target }: { target: number }) {
  const now = useNow();
  return <Countdown target={target} now={now} className="block text-right" />;
}

const helper = createColumnHelper<DataTableFeatures, Alert>();

const columns = helper.columns([
  helper.accessor("missionType", {
    id: "mission",
    header: ({ column }) => <SortableHeader column={column}>Mission</SortableHeader>,
    cell: ({ row }) => <TruncatedCell text={row.original.missionType} className="font-medium" />,
  }),
  helper.accessor("node", {
    id: "node",
    header: ({ column }) => <SortableHeader column={column}>Node</SortableHeader>,
    cell: ({ row }) => (
      <TruncatedCell
        text={`${row.original.node} · ${row.original.enemy}`}
        className="text-muted-foreground"
      />
    ),
  }),
  helper.accessor((a) => alertRewards(a), {
    id: "reward",
    header: ({ column }) => <SortableHeader column={column}>Reward</SortableHeader>,
    cell: ({ row }) => (
      <TruncatedCell text={alertRewards(row.original)} className="text-muted-foreground" />
    ),
  }),
  helper.accessor("expiresAt", {
    id: "expires",
    header: ({ column }) => (
      <SortableHeader column={column} align="end">
        Expires
      </SortableHeader>
    ),
    cell: ({ row }) => <ExpiryCell target={row.original.expiresAt} />,
  }),
]);

const WIDTHS = { mission: "w-28", expires: "w-24 text-right" };

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const now = useNow();
  // The query already drops expired rows, this keeps the list honest between polls.
  const rows = alerts.filter((a) => a.expiresAt > now).sort((a, b) => a.expiresAt - b.expiresAt);

  return (
    <Panel
      title="Alerts"
      icon={BellIcon}
      count={rows.length}
      className="md:col-span-2 lg:col-span-3"
    >
      <DataTable
        label="Alerts"
        columns={columns}
        data={rows}
        widths={WIDTHS}
        empty={<Empty>No alerts running.</Empty>}
      />
    </Panel>
  );
}
