"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AtSignIcon } from "@/components/icons/at-sign";
import { MessageSquareIcon } from "@/components/icons/message-square";
import { GripHorizontalIcon } from "@/components/icons/grip-horizontal";
import { SquarePenIcon } from "@/components/icons/square-pen";
import { XIcon } from "@/components/icons/x";
import { Switch } from "@/components/ui/switch";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditRuleDialog } from "@/components/rules/edit-rule-dialog";
import { ruleSentence } from "@/components/rules/sentence";
import { useRemoveRule, useUpdateRule, type Rule } from "@/components/rules/api";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

const CHANNEL_ICONS = { email: AtSignIcon, imessage: MessageSquareIcon } as const;

function created(at: number): string {
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function RuleRow({ rule }: { rule: Rule }) {
  const update = useUpdateRule();
  const remove = useRemoveRule();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  // A rejected toggle must put the switch back, otherwise the row lies about the rule.
  async function run(work: () => Promise<unknown>, fallback: string) {
    setBusy(true);
    try {
      await work();
    } catch (error) {
      toast.error(errorMessage(error, fallback));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-4 px-4 py-3 transition-colors duration-150 ease-out hover:bg-surface-2">
      <Switch
        aria-label={`Enable ${rule.name}`}
        checked={rule.enabled}
        disabled={busy}
        onCheckedChange={(checked) =>
          void run(() => update({ id: rule._id, enabled: checked }), "Could not change that rule.")
        }
      />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", !rule.enabled && "text-muted-foreground")}>{rule.name}</p>
        <p className="truncate text-sm text-muted-foreground">{ruleSentence(rule.filter)}</p>
      </div>
      <div className="hidden items-center gap-2 text-muted-foreground sm:flex">
        {rule.channels.map((c) => {
          const Icon = CHANNEL_ICONS[c];
          const label = c === "email" ? "Email" : "iMessage";
          return (
            <span key={c} className="flex items-center">
              <Icon size={16} aria-hidden="true" />
              <span className="sr-only">{label}</span>
            </span>
          );
        })}
      </div>
      <span className="hidden shrink-0 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted-foreground sm:inline">
        {rule.mode === "instant" ? "Instant" : "Hourly digest"}
      </span>
      {/* rules.list carries createdAt, not a last fired time, see polish.questions.md */}
      <span className="hidden shrink-0 font-mono text-xs text-muted-foreground tabular-nums md:inline">
        {created(rule.createdAt)}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${rule.name}`}
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        >
          <GripHorizontalIcon size={16} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <SquarePenIcon size={14} aria-hidden="true" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={busy}
            onClick={() => void run(() => remove({ id: rule._id }), "Could not delete that rule.")}
          >
            <XIcon size={14} aria-hidden="true" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditRuleDialog rule={rule} open={editing} onOpenChange={setEditing} />
    </li>
  );
}

export function RulesTable({ rules }: { rules: Rule[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      {rules.map((rule) => (
        <RuleRow key={rule._id} rule={rule} />
      ))}
    </ul>
  );
}
