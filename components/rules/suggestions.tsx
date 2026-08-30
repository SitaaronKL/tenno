"use client";

import { useState } from "react";
import { CreateRuleDialog } from "@/components/rules/create-rule-dialog";
import { useProfile } from "@/components/rules/api";
import type { RuleFilter, RuleInput } from "@/lib/contracts/rule";

export type Suggestion = { label: string; description: string; filter: RuleFilter };

// Rules worth having that a player would not think to write, one click from ready.
export const SUGGESTIONS: Suggestion[] = [
  {
    label: "Omnia Void Cascade",
    description: "The Omnia fissure rotation lands on Void Cascade",
    filter: { kind: "fissure", tiers: ["Omnia"], missionTypes: ["Void Cascade"], steelPath: null, storm: null },
  },
  {
    label: "10 minutes before Cetus night",
    description: "Enough warning to be on the plains when the Eidolons rise",
    filter: { kind: "cycle", world: "cetus", state: "night", leadMinutes: 10 },
  },
  {
    label: "Tier 5 bounty is Exterminate",
    description: "The top bounty on a Holdfasts, Hex or Cavia board is the fast one",
    filter: {
      kind: "bounty",
      syndicates: ["The Holdfasts", "The Hex", "Cavia"],
      level: 5,
      missionTypes: ["Exterminate"],
    },
  },
  {
    label: "Daily reset",
    description: "Sorties, dailies and the Steel Path honours roll at 00:00 UTC",
    filter: { kind: "reset", period: "daily" },
  },
  {
    label: "Weekly reset",
    description: "Archon Hunt, Nightwave and the weeklies roll on Monday 00:00 UTC",
    filter: { kind: "reset", period: "weekly" },
  },
  {
    label: "Baro is back",
    description: "Every Baro Ki'Teer arrival, whatever he brought",
    filter: { kind: "baro", items: null },
  },
  {
    label: "Baro brings a Primed mod",
    description: "Only when the manifest has a Primed mod on it",
    filter: { kind: "baro", items: ["Primed"] },
  },
  {
    label: "Invasion offers a Catalyst or Reactor",
    description: "The invasion rewards worth three runs",
    filter: { kind: "invasion", rewards: ["Orokin Catalyst", "Orokin Reactor"] },
  },
  {
    label: "Invasion offers Forma or Exilus",
    description: "Forma and Exilus adapters from the invasion boards",
    filter: { kind: "invasion", rewards: ["Forma", "Exilus"] },
  },
  {
    label: "Nitain alert",
    description: "Nitain Extract shows up rarely and never for long",
    filter: { kind: "alert", rewards: ["Nitain"] },
  },
  {
    label: "Archon Hunt is Boreal",
    description: "The week Boreal is the Archon, for the shard you want",
    filter: { kind: "archonHunt", boss: ["Boreal"] },
  },
  {
    label: "Sortie has Melee Only",
    description: "A Melee Only stage anywhere in today's sortie",
    filter: { kind: "sortie", boss: null, missionTypes: null, modifiers: ["Melee Only"] },
  },
  {
    label: "Nightwave new week",
    description: "The weekly acts rolled over, new standing to earn",
    filter: { kind: "nightwave" },
  },
  {
    label: "Orb Vallis turns warm",
    description: "The warm window on the Vallis, for Coolant Raknoids and fishing",
    filter: { kind: "cycle", world: "vallis", state: "warm", leadMinutes: null },
  },
  {
    label: "Cambion Vome",
    description: "Vome is up on the Drift, the half of the cycle Fass hunters wait for",
    filter: { kind: "cycle", world: "cambion", state: "vome", leadMinutes: null },
  },
];

export function RuleSuggestions() {
  const profile = useProfile();
  const [preset, setPreset] = useState<RuleInput | undefined>(undefined);
  const [open, setOpen] = useState(false);

  // The rule arrives ready on the channels the player already set up, they still confirm it.
  const channels: RuleInput["channels"] = profile?.phoneVerified ? ["email", "imessage"] : ["email"];

  function start(suggestion: Suggestion) {
    setPreset({ name: suggestion.label, filter: suggestion.filter, mode: "instant", channels });
    setOpen(true);
  }

  return (
    <section aria-labelledby="rule-suggestions" className="grid gap-2">
      <h2 id="rule-suggestions" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Suggestions
      </h2>
      <ul className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <li key={suggestion.label}>
            <button
              type="button"
              title={suggestion.description}
              onClick={() => start(suggestion)}
              className="rounded-full bg-surface-2 px-3 py-1 text-sm text-foreground ring-1 ring-border transition-colors duration-150 ease-out hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              {suggestion.label}
            </button>
          </li>
        ))}
      </ul>
      <CreateRuleDialog preset={preset} open={open} onOpenChange={setOpen} />
    </section>
  );
}
