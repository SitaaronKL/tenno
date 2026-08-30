"use client";

import { CreateRuleDialog } from "@/components/rules/create-rule-dialog";
import { RulesTable } from "@/components/rules/rules-table";
import { useRules } from "@/components/rules/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientOnly } from "@/components/rules/client-only";

function RulesBody() {
  const rules = useRules();
  if (rules === undefined) return <Skeleton className="h-40 w-full" />;
  if (rules.length === 0)
    return <p className="text-sm text-muted-foreground">No rules yet. Create one to get notified.</p>;
  return <RulesTable rules={rules} />;
}

export default function RulesPage() {
  return (
    <div className="grid gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rules</h1>
          <p className="text-sm text-muted-foreground">
            Voidwatch watches world state and pings you when a rule matches.
          </p>
        </div>
        <ClientOnly fallback={<Skeleton className="h-9 w-24" />}>
          <CreateRuleDialog />
        </ClientOnly>
      </div>
      <ClientOnly fallback={<Skeleton className="h-40 w-full" />}>
        <RulesBody />
      </ClientOnly>
    </div>
  );
}
