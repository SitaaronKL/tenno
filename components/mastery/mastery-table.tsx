"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Segmented } from "@/components/segmented";
import { DataTable } from "@/components/ui/data-table";
import { masteryColumns } from "./columns";
import { KIND_LABELS, isPrime, type MasteryKind, type MasteryRow } from "./types";

type PrimeFilter = "any" | "only" | "hide";
type MasteredFilter = "any" | "yes" | "no";

const PRIME_OPTIONS = [
  { value: "any" as const, label: "All" },
  { value: "only" as const, label: "Prime only" },
  { value: "hide" as const, label: "Hide Primes" },
];

const MASTERED_OPTIONS = [
  { value: "any" as const, label: "All" },
  { value: "yes" as const, label: "Mastered" },
  { value: "no" as const, label: "Not yet" },
];

export function MasteryTable({ rows, hasRoster = true }: { rows: MasteryRow[]; hasRoster?: boolean }) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<MasteryKind | "all">("all");
  const [prime, setPrime] = useState<PrimeFilter>("any");
  const [mastered, setMastered] = useState<MasteredFilter>("any");

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (kind !== "all" && row.kind !== kind) return false;
        if (prime === "only" && !isPrime(row)) return false;
        if (prime === "hide" && isPrime(row)) return false;
        if (mastered === "yes" && !row.mastered) return false;
        if (mastered === "no" && row.mastered) return false;
        return true;
      }),
    [rows, kind, prime, mastered],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search items"
          aria-label="Search items"
          className="h-9 w-56"
        />
        <Select value={kind} onValueChange={(next) => setKind(next as MasteryKind | "all")}>
          <SelectTrigger className="h-9 w-40" aria-label="Kind">
            <SelectValue placeholder="Kind" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Every kind</SelectItem>
            {(Object.keys(KIND_LABELS) as MasteryKind[]).map((value) => (
              <SelectItem key={value} value={value}>
                {KIND_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Segmented label="Primes" options={PRIME_OPTIONS} value={prime} onChange={setPrime} />
        <Segmented
          label="Mastered"
          options={MASTERED_OPTIONS}
          value={mastered}
          onChange={setMastered}
        />
      </div>
      <DataTable
        label="Mastery items"
        columns={masteryColumns}
        data={filtered}
        columnFilters={[{ id: "name", value: search }]}
        pageSize={25}
        bordered
        countLabel="items"
        emptyFiltered={
          hasRoster
            ? "Nothing matches these filters."
            : "No game data yet. Run the import step in the README to seed the roster."
        }
      />
    </div>
  );
}
