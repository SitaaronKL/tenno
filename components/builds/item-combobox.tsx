"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BuildItem } from "./types";

// A frame or weapon list is nine hundred rows, so it is typed at, never scrolled.
export function ItemCombobox({
  items,
  value,
  onChange,
}: {
  items: BuildItem[];
  value: string;
  onChange: (uniqueName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = items.find((item) => item.uniqueName === value);

  const results = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(needle)).slice(0, 40);
  }, [items, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="w-64 justify-start" aria-label="Frame or weapon">
            {selected ? selected.name : "Pick a frame or weapon"}
          </Button>
        }
      />
      <PopoverContent className="w-64 p-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search"
          aria-label="Search frames and weapons"
          className="h-9"
        />
        <ul className="mt-2 max-h-72 overflow-y-auto">
          {results.map((item) => (
            <li key={item.uniqueName}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent/40"
                onClick={() => {
                  onChange(item.uniqueName);
                  setOpen(false);
                }}
              >
                <span className="truncate">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.kind}</span>
              </button>
            </li>
          ))}
          {results.length === 0 ? (
            <li className="px-2 py-2 text-sm text-muted-foreground">Nothing by that name.</li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
