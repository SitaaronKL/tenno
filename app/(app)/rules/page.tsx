"use client";

import { useState } from "react";
import { CreateRuleDialog } from "@/components/rules/create-rule-dialog";
import { RulesTable } from "@/components/rules/rules-table";
import { useRules } from "@/components/rules/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientOnly } from "@/components/rules/client-only";
import { LogoMark } from "@/components/shell/logo-mark";
import { PageHeader } from "@/components/shell/page-header";
import type { RuleInput } from "@/lib/contracts/rule";

// Two rules worth having, one click away, so the empty page is not a blank form.
const EXAMPLES: RuleInput[] = [
  {
    name: "Axi Survival fissures",
    filter: {
      kind: "fissure",
      tiers: ["Axi"],
      missionTypes: ["Survival"],
      steelPath: null,
      storm: null,
    },
    mode: "instant",
    channels: ["email"],
  },
  {
    name: "Baro brings Primed Chamber",
    filter: { kind: "baro", items: ["Primed Chamber"] },
    mode: "instant",
    channels: ["email"],
  },
];

function RulesEmpty() {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<RuleInput | undefined>(undefined);

  function start(example?: RuleInput) {
    setPreset(example);
    setOpen(true);
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-card px-6 py-16 text-center ring-1 ring-foreground/10">
      <LogoMark size={32} className="opacity-40" />
      <p className="text-sm text-muted-foreground">No rules yet</p>
      <Button onClick={() => start()}>Create a rule</Button>
      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((example) => (
          <Button
            key={example.name}
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => start(example)}
          >
            {example.name}
          </Button>
        ))}
      </div>
      <CreateRuleDialog preset={preset} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function RulesBody() {
  const rules = useRules();
  if (rules === undefined) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (rules.length === 0) return <RulesEmpty />;
  return <RulesTable rules={rules} />;
}

export default function RulesPage() {
  return (
    <>
      <PageHeader
        title="Rules"
        helper="Voidwatch watches world state and pings you when a rule matches."
        action={
          <ClientOnly fallback={<Skeleton className="h-8 w-24 rounded-lg" />}>
            <CreateRuleDialog />
          </ClientOnly>
        }
      />
      <ClientOnly fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
        <RulesBody />
      </ClientOnly>
    </>
  );
}
