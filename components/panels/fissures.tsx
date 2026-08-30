"use client";

import { useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import type { Fissure } from "@/lib/contracts/worldstate";
import { AtomIcon } from "@/components/icons/atom";
import { Segmented } from "@/components/segmented";
import { Empty, Panel } from "./panel";
import { TierBadge, tierRank } from "./tier-badge";
import { Countdown } from "./countdown";
import { useNow } from "./use-now";
import {
  DataTable,
  SortableHeader,
  TruncatedCell,

  type DataTableFeatures,
} from "@/components/ui/data-table";

// Lith, Meso, Neo, Axi, Requiem, Omnia first, then soonest to expire inside a tier.
export function sortFissures(fissures: Fissure[]): Fissure[] {
  return [...fissures].sort(
    (a, b) => tierRank(a.tier) - tierRank(b.tier) || a.expiresAt - b.expiresAt,
  );
}

// "Steel Path" spelled out, because a chip does not say whether it is on or off.
export function modeText(f: Pick<Fissure, "steelPath" | "storm">): string {
  const parts: string[] = [];
  if (f.steelPath) parts.push("Steel Path");
  if (f.storm) parts.push("Void Storm");
  return parts.length ? parts.join(", ") : "Normal";
}

function ExpiryCell({ target }: { target: number }) {
  const now = useNow();
  return <Countdown target={target} now={now} className="block text-right" />;
}

const helper = createColumnHelper<DataTableFeatures, Fissure>();

const columns = helper.columns([
  helper.accessor((f) => tierRank(f.tier), {
    id: "tier",
    header: ({ column }) => <SortableHeader column={column}>Tier</SortableHeader>,
    cell: ({ row }) => <TierBadge tier={row.original.tier} />,
  }),
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
  helper.accessor((f) => modeText(f), {
    id: "mode",
    header: ({ column }) => <SortableHeader column={column}>Mode</SortableHeader>,
    cell: ({ row }) => (
      <TruncatedCell text={modeText(row.original)} className="text-muted-foreground" />
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

// Node is the only column that needs room, the rest hug their text.
const WIDTHS = {
  tier: "w-16",
  mission: "w-28",
  mode: "w-24",
  expires: "w-20 text-right",
};

// Steel Path is the split people actually filter on, so it is a control, not a search.
const PATH = [
  { value: "all", label: "All" },
  { value: "steel", label: "Steel Path" },
  { value: "normal", label: "Normal" },
] as const;
type Path = (typeof PATH)[number]["value"];

export function FissuresPanel({ fissures }: { fissures: Fissure[] }) {
  const now = useNow();
  const [path, setPath] = useState<Path>("all");
  // The query already drops expired rows, this keeps the list honest between polls.
  const rows = useMemo(() => {
    const open = fissures.filter((f) => f.expiresAt > now);
    const picked =
      path === "all" ? open : open.filter((f) => (path === "steel" ? f.steelPath : !f.steelPath));
    return sortFissures(picked);
  }, [fissures, now, path]);

  return (
    <Panel
      title="Fissures"
      icon={AtomIcon}
      count={rows.length}
      action={<Segmented label="Steel Path" options={PATH} value={path} onChange={setPath} />}
      className={CLASS}
    >
      <DataTable
        dense
        label="Void fissures"
        columns={columns}
        data={rows}
        widths={WIDTHS}
        empty={<Empty>No fissures open.</Empty>}
      />
    </Panel>
  );
}

const CLASS = "md:col-span-2 lg:col-span-4";
