# Data Table (shadcn guide, TanStack Table v9)

Pasted by Dhruv on 2026-08-30 from ui.shadcn.com, condensed. v9 is feature based and differs from v8: no `useReactTable`, no `getCoreRowModel`, no `flexRender` import needed.

Install: `npx shadcn@latest add table` and `npm install @tanstack/react-table` (v9).

Files: `columns.tsx` (client), `data-table-features.ts`, `data-table.tsx` (client), `page.tsx`.

## Features object (new in v9)

```ts
import {
  columnFilteringFeature, columnVisibilityFeature, createFilteredRowModel, createPaginatedRowModel,
  createSortedRowModel, filterFn_includesString, rowPaginationFeature, rowSelectionFeature,
  rowSortingFeature, sortFn_alphanumeric, sortFn_text, tableFeatures,
} from "@tanstack/react-table"

export const features = tableFeatures({
  columnFilteringFeature, columnVisibilityFeature, rowPaginationFeature, rowSelectionFeature, rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
})
export type DataTableFeatures = typeof features
```

Anything not registered is tree shaken, including filter and sort functions. Core row model is always included.

## Columns

```tsx
const columnHelper = createColumnHelper<DataTableFeatures, Payment>()
export const columns = columnHelper.columns([
  columnHelper.accessor("status", { header: "Status" }),
  columnHelper.accessor("amount", {
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => <div className="text-right">{format(row.getValue("amount"))}</div>,
  }),
  columnHelper.display({ id: "actions", cell: ({ row }) => <RowMenu item={row.original} /> }),
])
```

Sortable header: `<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Email <ArrowUpDown /></Button>`.

## Table component

```tsx
const [sorting, setSorting] = React.useState<SortingState>([])
const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({})
const [rowSelection, setRowSelection] = React.useState({})
const table = useTable({
  features, data, columns,
  onSortingChange: setSorting, onColumnFiltersChange: setColumnFilters,
  onColumnVisibilityChange: setColumnVisibility, onRowSelectionChange: setRowSelection,
  state: { sorting, columnFilters, columnVisibility, rowSelection },
})
// render
<TableHead>{header.isPlaceholder ? null : <table.FlexRender header={header} />}</TableHead>
<TableCell><table.FlexRender cell={cell} /></TableCell>
```

`<table.FlexRender header|cell />` lives on the table instance. Filtering: `table.getColumn("email")?.setFilterValue(value)`. Pagination: `table.previousPage()`, `table.nextPage()`, `table.getCanNextPage()`, pages of 10 by default. Visibility: `column.getCanHide()`, `column.toggleVisibility(bool)` in a `DropdownMenuCheckboxItem`. Selection: `Checkbox` with `table.getIsAllPageRowsSelected()`, `row.toggleSelected()`, count with `table.getFilteredSelectedRowModel().rows.length`.

Reusable pieces from the Tasks example: `DataTableColumnHeader`, `DataTablePagination`, `DataTableViewOptions`. Base UI triggers use `render={<Button />}` not `asChild`.
