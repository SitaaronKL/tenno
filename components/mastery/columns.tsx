"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { CheckIcon } from "@/components/icons/check";
import type { DataTableFeatures } from "@/components/ui/data-table";
import { KIND_LABELS, type MasteryRow } from "./types";

const helper = createColumnHelper<DataTableFeatures, MasteryRow>();

export const masteryColumns = helper.columns([
  helper.accessor("name", {
    header: "Name",
    filterFn: "includesString",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  }),
  helper.accessor("kind", {
    header: "Kind",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{KIND_LABELS[row.original.kind]}</span>
    ),
  }),
  helper.accessor("mastered", {
    header: "Mastered",
    cell: ({ row }) =>
      row.original.mastered ? (
        <span className="inline-flex items-center gap-1.5">
          <CheckIcon size={16} className="p-0" />
          <span className="sr-only">Mastered</span>
        </span>
      ) : (
        <span className="text-muted-foreground" aria-label="Not mastered">
          &mdash;
        </span>
      ),
  }),
  helper.accessor("masteryXp", {
    header: () => <div className="text-right">Mastery xp</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono tabular-nums">
        {row.original.masteryXp.toLocaleString()}
      </div>
    ),
  }),
]);
