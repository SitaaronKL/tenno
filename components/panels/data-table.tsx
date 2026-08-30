"use client";

import { useState, type ReactNode } from "react";
import {
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type Column,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Only sorting is registered, so filtering, paging and selection are tree shaken out.
export const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

export type DataTableFeatures = typeof features;
// TanStack itself types a mixed column array with any for the cell value, one column per value type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData, any>;

function SortArrows({ state }: { state: false | "asc" | "desc" }) {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" className="shrink-0">
      <path
        d="M6 1.5 L9 5 L3 5 Z"
        fill="currentColor"
        opacity={state === "asc" ? 1 : 0.35}
      />
      <path
        d="M6 10.5 L3 7 L9 7 Z"
        fill="currentColor"
        opacity={state === "desc" ? 1 : 0.35}
      />
    </svg>
  );
}

// One header button, so every sortable column announces and toggles the same way.
export function SortableHeader<TData extends RowData>({
  column,
  children,
  align = "start",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  column: Column<DataTableFeatures, TData, any>;
  children: ReactNode;
  align?: "start" | "end";
}) {
  const sorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      size="xs"
      className={cn("-mx-2 font-medium text-muted-foreground", align === "end" && "ml-auto")}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {children}
      <SortArrows state={sorted} />
    </Button>
  );
}

// Every cell that can truncate carries its full text in a tooltip.
export function TruncatedCell({ text, className }: { text: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className={cn("block max-w-full truncate text-left", className)} />}
      >
        {text}
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

export function DataTable<TData extends RowData>({
  label,
  columns,
  data,
  initialSorting = [],
  widths = {},
  empty,
}: {
  label: string;
  columns: DataColumn<TData>[];
  data: TData[];
  initialSorting?: SortingState;
  widths?: Record<string, string>;
  empty: ReactNode;
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const table = useTable({
    features,
    data,
    columns,
    onSortingChange: setSorting,
    state: { sorting },
  });

  if (data.length === 0) return <>{empty}</>;

  return (
    <Table aria-label={label} className="table-fixed">
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id} className="hover:bg-transparent">
            {group.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn("h-8 px-2 text-xs", widths[header.column.id])}
              >
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id} className="max-w-0 px-2 py-2">
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
