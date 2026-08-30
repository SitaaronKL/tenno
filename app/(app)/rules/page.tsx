"use client";

import { CreateRuleDialog } from "@/components/rules/create-rule-dialog";
import { RulesTable } from "@/components/rules/rules-table";
import { useRules } from "@/components/rules/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function RulesPage() {
  const rules = useRules();

  return (
    <div className="grid gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rules</h1>
          <p className="text-sm text-muted-foreground">
            Tenno watches world state and pings you when a rule matches.
          </p>
        </div>
        <CreateRuleDialog />
      </div>
      {rules === undefined ? (
        <Skeleton className="h-40 w-full" />
      ) : rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rules yet. Create one to get notified.</p>
      ) : (
        <RulesTable rules={rules} />
      )}
    </div>
  );
}
