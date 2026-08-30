"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";
import { useDraftBuild } from "./api";
import { DRAFT_KEY } from "./types";

// The agent's answer is never saved. It waits in session storage while the editor opens.
export function DraftWithAgent() {
  const router = useRouter();
  const draftBuild = useDraftBuild();
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const draft = await draftBuild({ item, goal });
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ ...draft, forma: 0, orokinReactor: true, public: false }),
      );
      setOpen(false);
      router.push("/builds/new");
    } catch (error) {
      toast.error(errorMessage(error, "The draft did not come back"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-full" onClick={() => setOpen(true)}>
        Draft a build with the agent
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Draft a build</DialogTitle>
          </DialogHeader>
          <Input
            value={item}
            onChange={(event) => setItem(event.target.value)}
            placeholder="Frame or weapon, for example Rhino"
            aria-label="Frame or weapon"
          />
          <Input
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="What is it for, for example survive Steel Path"
            aria-label="Goal"
          />
          <Button onClick={() => void run()} disabled={busy || !item.trim() || !goal.trim()}>
            {busy ? "Drafting" : "Draft it"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
