"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useHiddenPrefs } from "@/components/hidden";
import { HIDDEN_GROUPS } from "@/lib/contracts/preferences";

// A switch is on when the piece is shown, so the page reads the way the dashboard looks.
export function WorldStateCard() {
  const { hidden, setHidden } = useHiddenPrefs();

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
      </CardContent>
    </Card>
  );
}
