"use client";

import { useState } from "react";
import { Mail, MessageSquare, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

const CHANNEL_ICONS = { email: Mail, imessage: MessageSquare } as const;

function created(at: number): string {
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function RuleRow({ rule }: { rule: Rule }) {
  const update = useUpdateRule();
  const remove = useRemoveRule();
  const [editing, setEditing] = useState(false);

  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <Switch
        aria-label={`Enable ${rule.name}`}
        checked={rule.enabled}
        onCheckedChange={(checked) => void update({ id: rule._id, enabled: checked })}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", !rule.enabled && "text-muted-foreground")}>{rule.name}</p>
        <p className="truncate text-sm text-muted-foreground">{ruleSentence(rule.filter)}</p>
      </div>
      <div className="hidden items-center gap-2 text-muted-foreground sm:flex">
        {rule.channels.map((c) => {
          const Icon = CHANNEL_ICONS[c];
          return <Icon key={c} className="size-4" aria-label={c === "email" ? "Email" : "iMessage"} />;
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
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => void remove({ id: rule._id })}
          >
            <Trash2 aria-hidden="true" /> Delete
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
