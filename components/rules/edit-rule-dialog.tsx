"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RuleForm } from "@/components/rules/rule-form";
import { useUpdateRule, type Rule } from "@/components/rules/api";

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
          onSubmit={async (input) => {
            await update({ id: rule._id, ...input });
            onOpenChange(false);
          }}
        />
        </div>
      </DialogContent>
    </Dialog>
  );
}
