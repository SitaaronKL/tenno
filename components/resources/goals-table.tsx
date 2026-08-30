"use client";

import { useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, SortableHeader, type DataTableFeatures } from "@/components/ui/data-table";
import { XIcon } from "@/components/icons/x";
import { CreateRuleDialog } from "@/components/rules/create-rule-dialog";
import { farmRule, topSources, type LiveDrop } from "@/convex/lib/resources";
import type { Goal } from "./api";

export type GoalRow = Goal & { live: LiveDrop[] };

const helper = createColumnHelper<DataTableFeatures, GoalRow>();

function percent(row: GoalRow) {
  if (row.wantedCount <= 0) return 100;
  return Math.min(100, Math.round((row.haveCount / row.wantedCount) * 100));
}

// Black and white on purpose: the fill is the foreground, the track is the same colour at a tenth.
function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10"
    >
      <div className="h-full rounded-full bg-foreground" style={{ width: `${value}%` }} />
    </div>
  );
}

// Typing commits on blur or Enter, so a count is edited where it is read.
function HaveCell({ row, onSetHave }: { row: GoalRow; onSetHave: (row: GoalRow, have: number) => void }) {
  const [text, setText] = useState(String(row.haveCount));
  const [editing, setEditing] = useState(false);
  const shown = editing ? text : String(row.haveCount);

  function commit() {
    setEditing(false);
    const next = Number(shown);
    if (Number.isFinite(next) && next !== row.haveCount) onSetHave(row, Math.max(0, next));
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 font-mono text-sm tabular-nums">
        <Input
          aria-label={`Have of ${row.itemName}`}
          value={shown}
          inputMode="numeric"
          className="h-7 w-20 px-2 text-right font-mono tabular-nums"
          onChange={(event) => {
            setEditing(true);
            setText(event.target.value);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <span className="text-muted-foreground">/ {row.wantedCount.toLocaleString()}</span>
      </div>
      <ProgressBar value={percent(row)} label={`${row.itemName} progress`} />
    </div>
  );
}

// The best farms sit in the row, not behind a click. That is the whole point of the page.
function FarmsCell({ row }: { row: GoalRow }) {
  const best = topSources(row.sources, 3);
  if (best.length === 0) {
    return <span className="text-muted-foreground">No drop table entry</span>;
  }
  return (
    <ul className="space-y-0.5">
      {best.map((source) => (
        <li key={`${source.place}:${source.rotation}`} className="flex items-baseline gap-2">
          <span className="truncate">{source.place}</span>
          {source.rotation ? (
            <span className="shrink-0 text-xs text-muted-foreground">rot {source.rotation}</span>
          ) : null}
          <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {source.chance}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function LiveCell({ row }: { row: GoalRow }) {
  if (row.live.length === 0) return <span className="text-muted-foreground">&mdash;</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {row.live.map((drop) => (
        <Badge key={drop.label} variant="outline" className="gap-1.5">
          <span className="size-1.5 rounded-full bg-foreground" aria-hidden="true" />
          Live now, {drop.label}
        </Badge>
      ))}
    </div>
  );
}

// A rule prefilled from the row. Only shown where a rule kind can name the item.
function FarmButton({ row }: { row: GoalRow }) {
  const [open, setOpen] = useState(false);
  const preset = farmRule(row.itemName, row.live);
  if (!preset) return null;
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Farm this
      </Button>
      {/* Mounted on demand: the dialog reads Convex, and a table of rows would open that many clients. */}
      {open ? <CreateRuleDialog preset={preset} open onOpenChange={setOpen} /> : null}
    </>
  );
}

function columns(
  onSetHave: (row: GoalRow, have: number) => void,
  onRemove: (row: GoalRow) => void,
) {
  return helper.columns([
    helper.accessor("itemName", {
      header: ({ column }) => <SortableHeader column={column}>Item</SortableHeader>,
      filterFn: "includesString",
      cell: ({ row }) => <span className="font-medium">{row.original.itemName}</span>,
    }),
    helper.accessor((row) => percent(row), {
      id: "have",
      header: ({ column }) => <SortableHeader column={column}>Have / wanted</SortableHeader>,
      cell: ({ row }) => <HaveCell row={row.original} onSetHave={onSetHave} />,
    }),
    helper.display({
      id: "farms",
      header: "Best farms",
      cell: ({ row }) => <FarmsCell row={row.original} />,
    }),
    helper.display({
      id: "live",
      header: "Right now",
      cell: ({ row }) => <LiveCell row={row.original} />,
    }),
    helper.display({
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <FarmButton row={row.original} />
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Remove ${row.original.itemName}`}
            onClick={() => onRemove(row.original)}
          >
            <XIcon size={14} />
          </Button>
        </div>
      ),
    }),
  ]);
}

export function GoalsTable({
  rows,
  onSetHave,
  onRemove,
}: {
  rows: GoalRow[];
  onSetHave: (row: GoalRow, have: number) => void;
  onRemove: (row: GoalRow) => void;
}) {
  const [search, setSearch] = useState("");
  const cols = useMemo(() => columns(onSetHave, onRemove), [onSetHave, onRemove]);

  return (
    <div className="space-y-4">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Filter goals"
        aria-label="Filter goals"
        className="h-9 w-56"
      />
      <DataTable
        label="Farming goals"
        columns={cols}
        data={rows}
        columnFilters={[{ id: "itemName", value: search }]}
        widths={{ have: "w-48", live: "w-64", actions: "w-40" }}
        pageSize={25}
        bordered
        countLabel="goals"
      />
    </div>
  );
}
