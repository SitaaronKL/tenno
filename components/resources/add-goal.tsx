"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";
import type { ItemName } from "./api";

const LIMIT = 8;

// Prefix first, then anything containing the text, so typing "rub" offers Rubedo before Ferrite.
export function matchNames(names: ItemName[], query: string): ItemName[] {
  const text = query.trim().toLowerCase();
  if (text === "") return [];
  const starts = names.filter((item) => item.name.toLowerCase().startsWith(text));
  const contains = names.filter(
    (item) => !item.name.toLowerCase().startsWith(text) && item.name.toLowerCase().includes(text),
  );
  return [...starts, ...contains].slice(0, LIMIT);
}

export function AddGoal({
  names,
  onAdd,
  onAddRecipe,
}: {
  names: ItemName[];
  onAdd: (itemName: string, wantedCount: number) => Promise<unknown>;
  onAddRecipe: (uniqueName: string) => Promise<unknown>;
}) {
  const [query, setQuery] = useState("");
  const [count, setCount] = useState("1");
  const [busy, setBusy] = useState(false);
  const matches = useMemo(() => matchNames(names, query), [names, query]);

  async function run(work: Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await work;
      setQuery("");
      setCount("1");
      toast.success(done);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not add that goal, try again."));
    } finally {
      setBusy(false);
    }
  }

  const wanted = Math.max(1, Math.round(Number(count) || 1));

  return (
    <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search any item, part or resource"
          aria-label="Search any item, part or resource"
          className="h-9 w-72"
        />
        <Input
          value={count}
          onChange={(event) => setCount(event.target.value)}
          inputMode="numeric"
          aria-label="How many"
          className="h-9 w-20 text-right font-mono tabular-nums"
        />
      </div>
      {query.trim() !== "" ? (
        <ul aria-label="Matching items" className="divide-y divide-border">
          {matches.length === 0 ? (
            <li className="py-2 text-sm text-muted-foreground">Nothing by that name.</li>
          ) : (
            matches.map((item) => (
              <li key={item.uniqueName} className="flex items-center gap-2 py-1.5">
                <span className="flex-1 truncate text-sm">{item.name}</span>
                {item.buildable ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void run(onAddRecipe(item.uniqueName), `Added everything ${item.name} needs`)
                    }
                  >
                    Add recipe
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void run(onAdd(item.name, wanted), `Tracking ${item.name}`)}
                >
                  Track
                </Button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
