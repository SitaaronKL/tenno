"use client";

import { createColumnHelper } from "@tanstack/react-table";
import type { Invasion, Reward } from "@/lib/contracts/worldstate";
import { TornadoIcon } from "@/components/icons/tornado";
import { Empty, Panel } from "./panel";
import { DataTable, SortableHeader, TruncatedCell, type DataTableFeatures } from "@/components/ui/data-table";

export function rewardText(r: Reward | null): string {
  if (!r) return "No reward";
  if (r.item) return r.count > 1 ? `${r.item} x${r.count}` : r.item;
  return `${r.credits.toLocaleString()} credits`;
}

function Progress({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1 w-full overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

const helper = createColumnHelper<DataTableFeatures, Invasion>();

const columns = helper.columns([
  helper.accessor("node", {
    id: "node",
    header: ({ column }) => <SortableHeader column={column}>Node</SortableHeader>,
    cell: ({ row }) => <TruncatedCell text={row.original.node} className="font-medium" />,
  }),
  helper.accessor("description", {
    id: "description",
    header: ({ column }) => <SortableHeader column={column}>Fight</SortableHeader>,
    cell: ({ row }) => (
      <TruncatedCell text={row.original.description} className="text-muted-foreground" />
    ),
  }),
  helper.accessor((i) => rewardText(i.attacker.reward), {
    id: "attacker",
    header: ({ column }) => <SortableHeader column={column}>Attacker</SortableHeader>,
    cell: ({ row }) => (
      <TruncatedCell
        text={`${row.original.attacker.faction}: ${rewardText(row.original.attacker.reward)}`}
        className="text-muted-foreground"
      />
    ),
  }),
  helper.accessor((i) => rewardText(i.defender.reward), {
    id: "defender",
    header: ({ column }) => <SortableHeader column={column}>Defender</SortableHeader>,
    cell: ({ row }) => (
      <TruncatedCell
        text={`${row.original.defender.faction}: ${rewardText(row.original.defender.reward)}`}
        className="text-muted-foreground"
      />
    ),
  }),
  helper.accessor("completion", {
    id: "completion",
    header: ({ column }) => <SortableHeader column={column}>Progress</SortableHeader>,
    cell: ({ row }) => <Progress value={row.original.completion} />,
  }),
]);

const WIDTHS = { node: "w-32", completion: "w-32" };

export function InvasionsPanel({ invasions }: { invasions: Invasion[] }) {
  return (
    <Panel
      title="Invasions"
      icon={TornadoIcon}
      count={invasions.length}
      className="md:col-span-2 lg:col-span-3"
    >
      <DataTable
        dense
        label="Invasions"
        columns={columns}
        data={invasions}
        widths={WIDTHS}
        empty={<Empty>No invasions running.</Empty>}
      />
    </Panel>
  );
}
