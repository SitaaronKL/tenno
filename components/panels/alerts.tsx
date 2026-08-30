"use client";

import { createColumnHelper } from "@tanstack/react-table";
import type { Alert } from "@/lib/contracts/worldstate";
import { Countdown } from "./countdown";
import { useNow } from "./use-now";
import { SortableHeader, TruncatedCell, type DataTableFeatures } from "@/components/ui/data-table";

export function alertRewards(a: Alert): string {
  const text = a.rewards.map((r) => r.item || `${r.credits.toLocaleString()} cr`).join(", ");
  return text || "No reward";
}

function ExpiryCell({ target }: { target: number }) {
  const now = useNow();
  return <Countdown target={target} now={now} className="block text-right" />;
}

const helper = createColumnHelper<DataTableFeatures, Alert>();

export const alertColumns = helper.columns([
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

export const alertWidths = { mission: "w-28", expires: "w-24 text-right" };

