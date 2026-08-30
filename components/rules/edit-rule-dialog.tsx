"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RuleForm } from "@/components/rules/rule-form";
import { useUpdateRule, type Rule } from "@/components/rules/api";

export function EditRuleDialog({ rule }: { rule: Rule }) {
  const update = useUpdateRule();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" aria-label={`Edit ${rule.name}`} />}>
        Edit
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit rule</DialogTitle>
        </DialogHeader>
        <RuleForm
          initial={{ name: rule.name, filter: rule.filter, mode: rule.mode, channels: rule.channels }}
          submitLabel="Save changes"
          onSubmit={async (input) => {
            await update({ id: rule._id, ...input });
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
