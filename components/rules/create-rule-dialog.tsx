"use client";

import { useState } from "react";
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
import { useCreateRule, useDraftRule } from "@/components/rules/api";
import type { RuleInput } from "@/lib/contracts/rule";

export function CreateRuleDialog() {
  const create = useCreateRule();
  const draft = useDraftRule();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [drafted, setDrafted] = useState<RuleInput | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(input: RuleInput) {
    await create(input);
    setOpen(false);
    setDrafted(null);
    setText("");
  }

  async function describe() {
    setDrafting(true);
    setError(null);
    try {
      setDrafted(await draft({ text }));
    } catch {
      setError("Could not turn that into a rule, try rewording it.");
    } finally {
      setDrafting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New rule</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New rule</DialogTitle>
          <DialogDescription>Tell Tenno what to watch for and how to reach you.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="build">
          <TabsList>
            <TabsTrigger value="build">Build it</TabsTrigger>
            <TabsTrigger value="describe">Describe it</TabsTrigger>
          </TabsList>
          <TabsContent value="build">
            <RuleForm onSubmit={save} submitLabel="Create rule" />
          </TabsContent>
          <TabsContent value="describe" className="grid gap-3">
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
            {drafted && (
              <div className="grid gap-3 border-t pt-3">
                <p className="text-sm text-muted-foreground">Check the draft, then create it.</p>
                <RuleForm key={drafted.name} initial={drafted} onSubmit={save} submitLabel="Create rule" />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
