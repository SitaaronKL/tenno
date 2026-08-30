"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFetchProfile } from "./api";

const STEPS = [
  "Sign in at warframe.com in any browser, phone included.",
  "Open warframe.com/api/user-data in the same browser.",
  "Copy the 24 character user_id from the text it returns.",
];

export function PlayerIdCard({
  playerId,
  onSaved,
}: {
  playerId: string | null;
  onSaved: (id: string) => void;
}) {
  const [value, setValue] = useState(playerId ?? "");
  const [busy, setBusy] = useState(false);
  const fetchProfile = useFetchProfile();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const id = value.trim().toLowerCase();
    setBusy(true);
    try {
      const result = await fetchProfile({ playerId: id });
      onSaved(id);
      toast.success(
        result.cached ? `Loaded ${result.displayName} from cache` : `Synced ${result.displayName}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That lookup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your account id</CardTitle>
        <CardDescription>
          DE only answers to the id, not to a name. We fetch it once every six hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div className="grow space-y-1.5">
            <Label htmlFor="playerId">Player id</Label>
            <Input
              id="playerId"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="24 hexadecimal characters"
              className="font-mono"
            />
          </div>
          <Button type="submit" disabled={busy || value.trim() === ""}>
            {busy ? "Syncing" : "Sync profile"}
          </Button>
        </form>
        <div className="rounded-lg bg-surface-2 p-4 text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">How to find your id</p>
          <ol className="list-decimal space-y-1 pl-4">
            {STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-2">
            On a phone the page opens as plain text, so long press the id and copy it.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
