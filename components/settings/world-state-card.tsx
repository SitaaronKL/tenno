"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/segmented";
import { useHiddenPrefs } from "@/components/hidden";
import {
  FISSURE_LITH_FIRST,
  FISSURE_PATH_PREFS,
  HIDDEN_GROUPS,
} from "@/lib/contracts/preferences";

const PATH_OPTIONS = [
  { value: "all", label: "All" },
  ...FISSURE_PATH_PREFS.map((entry) => ({ value: entry.value as string, label: entry.label })),
] as const;

const ORDER_OPTIONS = [
  { value: "high", label: "Highest first" },
  { value: "low", label: "Lowest first" },
] as const;

// A switch is on when the piece is shown, so the page reads the way the dashboard looks.
export function WorldStateCard() {
  const { hidden, setHidden, setKeys } = useHiddenPrefs();
  const pathValue = FISSURE_PATH_PREFS.find((entry) => hidden.has(entry.key))?.value ?? "all";
  const orderValue = hidden.has(FISSURE_LITH_FIRST) ? "low" : "high";

  return (
    <Card>
      <CardHeader>
        <CardTitle>World state</CardTitle>
        <CardDescription>Turn off anything you never look at. It saves as you switch.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-3">
        {HIDDEN_GROUPS.map((group) => (
          <fieldset key={group.title} className="grid content-start gap-2">
            <legend className="pb-2 text-xs font-medium tracking-wide text-muted-foreground">
              {group.title}
            </legend>
            {group.keys.map((entry) => {
              const id = `hide-${entry.key}`;
              return (
                <div key={entry.key} className="flex items-center justify-between gap-3">
                  <Label htmlFor={id} className="text-sm font-normal">
                    {entry.label}
                  </Label>
                  <Switch
                    id={id}
                    checked={!hidden.has(entry.key)}
                    onCheckedChange={(shown) => setHidden(entry.key, !shown)}
                  />
                </div>
              );
            })}
          </fieldset>
        ))}
        <fieldset className="grid content-start gap-3">
          <legend className="pb-2 text-xs font-medium tracking-wide text-muted-foreground">
            Fissures
          </legend>
          <div className="grid justify-items-start gap-1.5">
            <span className="text-sm">Default view</span>
            <Segmented
              label="Default fissure view"
              options={PATH_OPTIONS}
              value={pathValue}
              onChange={(next) =>
                setKeys(FISSURE_PATH_PREFS.map((entry) => [entry.key, entry.value === next]))
              }
            />
          </div>
          <div className="grid justify-items-start gap-1.5">
            <span className="text-sm">Tier order</span>
            <Segmented
              label="Tier order"
              options={ORDER_OPTIONS}
              value={orderValue}
              onChange={(next) => setHidden(FISSURE_LITH_FIRST, next === "low")}
            />
          </div>
        </fieldset>
      </CardContent>
    </Card>
  );
}
