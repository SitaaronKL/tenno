"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import type { DataTableFeatures } from "@/components/ui/data-table";
import type { BuildRow } from "./types";

const helper = createColumnHelper<DataTableFeatures, BuildRow>();

function ago(at: number): string {
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 60) return `${Math.max(0, minutes)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export const buildColumns = helper.columns([
  helper.accessor("name", {
    header: "Build",
    filterFn: "includesString",
    cell: ({ row }) => (
      <Link href={`/builds/${row.original._id}`} className="font-medium hover:underline">
        {row.original.name}
      </Link>
    ),
  }),
  helper.accessor("itemName", {
    header: "Item",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.itemName}</span>,
  }),
  helper.accessor("public", {
    header: "Shared",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.public ? "Public" : "Private"}</span>
    ),
  }),
  helper.accessor("forma", {
    header: () => <div className="text-right">Forma</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono tabular-nums">{row.original.forma}</div>
    ),
  }),
  helper.accessor("updatedAt", {
    header: () => <div className="text-right">Updated</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono tabular-nums text-muted-foreground">
        {ago(row.original.updatedAt)}
      </div>
    ),
  }),
]);
