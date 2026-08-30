"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SquarePenIcon } from "@/components/icons/square-pen";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RuleForm } from "@/components/rules/rule-form";
import { ruleSentence } from "@/components/rules/sentence";
import { useCreateRule, useDraftRule } from "@/components/rules/api";
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
  const draft = useDraftRule();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [text, setText] = useState("");
  const [drafted, setDrafted] = useState<RuleInput | null>(null);
  const [editing, setEditing] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (controlled) onOpenChange?.(next);
    else setUncontrolledOpen(next);
  };

  async function save(input: RuleInput) {
    setSaving(true);
    setError(null);
    try {
      await create(input);
      setOpen(false);
      setDrafted(null);
      setEditing(false);
      setText("");
    } catch (caught) {
      const message = errorMessage(caught, "Could not save that rule, try again.");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function describe() {
    setDrafting(true);
    setError(null);
    try {
      setDrafted(await draft({ text }));
      setEditing(false);
    } catch {
      setError("Could not turn that into a rule, try rewording it.");
    } finally {
      setDrafting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlled ? null : <DialogTrigger render={<Button />}>New rule</DialogTrigger>}
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New rule</DialogTitle>
          <DialogDescription>Tell Voidwatch what to watch for and how to reach you.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="build" className="min-h-0">
          <TabsList>
            <TabsTrigger value="build">Build</TabsTrigger>
            <TabsTrigger value="describe">Describe</TabsTrigger>
          </TabsList>
          <TabsContent value="build" className="max-h-[60vh] min-h-[24rem] overflow-y-auto pt-2">
            <RuleForm key={preset?.name} initial={preset} onSubmit={save} submitLabel="Create rule" pending={saving} />
          </TabsContent>
          <TabsContent value="describe" className="grid max-h-[60vh] min-h-[24rem] content-start gap-3 overflow-y-auto pt-2">
            <Textarea
              aria-label="Describe the rule"
              value={text}
              placeholder="Text me when an Axi Survival fissure opens"
              onChange={(e) => setText(e.target.value)}
            />
            <Button type="button" onClick={() => void describe()} disabled={drafting || !text.trim()}>
              {drafting ? "Drafting" : "Draft rule"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {drafted && !editing && (
              <div className="grid gap-3 rounded-xl bg-surface-2 p-4 ring-1 ring-border">
                <p className="font-medium">{drafted.name}</p>
                <p className="text-sm text-muted-foreground">{ruleSentence(drafted.filter)}</p>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => void save(drafted)}>
                    Save rule
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(true)}>
                    <SquarePenIcon size={14} aria-hidden="true" /> Edit
                  </Button>
                </div>
              </div>
            )}
            {drafted && editing && (
              <RuleForm key={drafted.name} initial={drafted} onSubmit={save} submitLabel="Create rule" pending={saving} />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
