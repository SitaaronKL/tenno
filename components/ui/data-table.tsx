"use client";

import { useState, type ReactNode } from "react";
import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type ColumnFiltersState,
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

// One features object for the whole app, so a caller never registers its own.
// Visibility and selection stay out, nothing here needs them, so they tree shake away.
export const features = tableFeatures({
  columnFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

export type DataTableFeatures = typeof features;
// TanStack itself types a mixed column array with any for the cell value, one column per value type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData, any>;

function SortArrows({ state }: { state: false | "asc" | "desc" }) {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" className="shrink-0">
      <path d="M6 1.5 L9 5 L3 5 Z" fill="currentColor" opacity={state === "asc" ? 1 : 0.35} />
      <path d="M6 10.5 L3 7 L9 7 Z" fill="currentColor" opacity={state === "desc" ? 1 : 0.35} />
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
  columnFilters = [],
  widths = {},
  pageSize,
  dense = false,
  bordered = false,
  countLabel,
  empty,
  emptyFiltered = "Nothing matches these filters.",
}: {
  label: string;
  columns: DataColumn<TData>[];
  data: TData[];
  initialSorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  widths?: Record<string, string>;
  pageSize?: number;
  dense?: boolean;
  bordered?: boolean;
  countLabel?: string;
  empty?: ReactNode;
  emptyFiltered?: ReactNode;
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [ownFilters, setOwnFilters] = useState<ColumnFiltersState>([]);
  const table = useTable({
    features,
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setOwnFilters,
    state: { sorting, columnFilters: [...columnFilters, ...ownFilters] },
    ...(pageSize ? { initialState: { pagination: { pageIndex: 0, pageSize } } } : {}),
  });

  // A panel with nothing to show renders its own empty state instead of a header row.
  if (data.length === 0 && empty) return <>{empty}</>;

  const rows = table.getRowModel().rows;
  const table_ = (
    <Table aria-label={label} className={cn(dense && "table-fixed")}>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id} className="hover:bg-transparent">
            {group.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn(dense && "h-8 px-2 text-xs", widths[header.column.id])}
              >
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
              {emptyFiltered}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id} className={cn(dense && "max-w-0 px-2 py-2")}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  if (!bordered && !pageSize) return table_;

  return (
    <div className="space-y-3">
      <div className={cn(bordered && "rounded-xl border border-border")}>{table_}</div>
      {pageSize ? (
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {table.getFilteredRowModel().rows.length} {countLabel ?? "rows"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
