"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { modDrain, type ModDef, type ModSlot, type Polarity } from "@/lib/builds/capacity";
import { POLARITIES, POLARITY_SYMBOL } from "./types";

// One dialog for every slot. The slot decides which mods are even offered.
export function ModPicker({
  open,
  slot,
  mods,
  onPick,
  onClear,
  onOpenChange,
}: {
  open: boolean;
  slot: ModSlot;
  mods: ModDef[];
  onPick: (mod: ModDef) => void;
  onClear: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [polarity, setPolarity] = useState<Polarity | "all">("all");
  const [type, setType] = useState<string>("all");

  const forSlot = useMemo(() => mods.filter((mod) => mod.slot === slot), [mods, slot]);
  const types = useMemo(
    () => [...new Set(forSlot.map((mod) => mod.type ?? "---"))].sort((a, b) => a.localeCompare(b)),
    [forSlot],
  );

  const results = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return forSlot
      .filter((mod) => {
        if (needle && !mod.name.toLowerCase().includes(needle)) return false;
        if (polarity !== "all" && mod.polarity !== polarity) return false;
        if (type !== "all" && (mod.type ?? "---") !== type) return false;
        return true;
      })
      .slice(0, 120);
  }, [forSlot, search, polarity, type]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pick a mod</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search mods"
            aria-label="Search mods"
            className="h-9 w-52"
          />
          <Select
            value={polarity}
            onValueChange={(next) => setPolarity(next as Polarity | "all")}
          >
            <SelectTrigger className="h-9 w-36" aria-label="Polarity">
              <SelectValue placeholder="Polarity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any polarity</SelectItem>
              {POLARITIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {POLARITY_SYMBOL[value]} {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={(next) => setType(next ?? "all")}>
            <SelectTrigger className="h-9 w-40" aria-label="Type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Every type</SelectItem>
              {types.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={onClear}>
            Empty the slot
          </Button>
        </div>
        <ul className="max-h-96 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {results.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">Nothing matches these filters.</li>
          ) : (
            results.map((mod) => (
              <li key={mod.uniqueName}>
                <button
                  type="button"
                  onClick={() => onPick(mod)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent/40"
                >
                  <span className="w-5 font-mono text-sm">{POLARITY_SYMBOL[mod.polarity]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{mod.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {mod.description || mod.type || ""}
                    </span>
                  </span>
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    {modDrain(mod, mod.fusionLimit)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
