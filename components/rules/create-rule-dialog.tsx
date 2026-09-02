"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RuleForm } from "@/components/rules/rule-form";
import { ruleSentence } from "@/components/rules/sentence";
import { useCreateRule } from "@/components/rules/api";
import { errorMessage } from "@/lib/errors";
import type { RuleInput } from "@/lib/contracts/rule";

export function CreateRuleDialog({
  open: controlledOpen,
  onOpenChange,
  preset,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  preset?: RuleInput;
}) {
  const create = useCreateRule();
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [text, setText] = useState("");
  const [manual, setManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (controlled) onOpenChange?.(next);
    else setUncontrolledOpen(next);
    if (!next) setManual(false);
  };

  // A suggestion chip already is the rule, so it lands straight in the form.
  const building = manual || Boolean(preset);

  async function save(input: RuleInput) {
    setSaving(true);
    setError(null);
    try {
      await create(input);
      setOpen(false);
      setText("");
    } catch (caught) {
      const message = errorMessage(caught, "Could not save that rule, try again.");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  // The agent can ask back, so describing continues as a conversation instead of a one shot draft.
  function continueInChat() {
    const described = text.trim();
    if (!described) return;
    setOpen(false);
    router.push(`/chat?describe=${encodeURIComponent(described)}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlled ? null : <DialogTrigger render={<Button />}>New rule</DialogTrigger>}
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New rule</DialogTitle>
          <DialogDescription>
            {building
              ? "Tell Voidwatch what to watch for and how to reach you."
              : "Describe what you want to be notified for."}
          </DialogDescription>
        </DialogHeader>
        {building ? (
          <div className="max-h-[60vh] min-h-[24rem] overflow-y-auto pt-2">
            {/* A prefilled rule reads back as its sentence, so the user sees what they are about to save. */}
            {preset && <p className="pb-3 text-sm text-muted-foreground">{ruleSentence(preset.filter)}</p>}
            <RuleForm key={preset?.name} initial={preset} onSubmit={save} submitLabel="Create rule" pending={saving} />
            {error && <p className="pt-3 text-sm text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="grid content-start gap-3 pt-2">
            <Textarea
              aria-label="Describe the rule"
              value={text}
              placeholder="Notify me when a Steel Path Void Cascade opens on Omnia"
              rows={3}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  continueInChat();
                }
              }}
            />
            <Button type="button" onClick={continueInChat} disabled={text.trim() === ""}>
              Ask your Cephalon
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="justify-self-center text-muted-foreground"
              onClick={() => setManual(true)}
            >
              I want to build it manually
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
