"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RuleForm } from "@/components/rules/rule-form";
import { useUpdateRule, type Rule } from "@/components/rules/api";
import { errorMessage } from "@/lib/errors";

export function EditRuleDialog({
  rule,
  open,
  onOpenChange,
}: {
  rule: Rule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateRule();
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit rule</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] min-h-[24rem] overflow-y-auto">
        <RuleForm
          initial={{ name: rule.name, filter: rule.filter, mode: rule.mode, channels: rule.channels }}
          submitLabel="Save changes"
          pending={saving}
          onSubmit={async (input) => {
            setSaving(true);
            try {
              await update({ id: rule._id, ...input });
              onOpenChange(false);
            } catch (error) {
              toast.error(errorMessage(error, "Could not save that rule, try again."));
            } finally {
              setSaving(false);
            }
          }}
        />
        </div>
      </DialogContent>
    </Dialog>
  );
}
