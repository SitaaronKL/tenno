"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/rules/tag-input";
import {
  EVENT_KINDS,
  RuleInput,
  type EventKind,
  type RuleFilter,
} from "@/lib/contracts/rule";

const TIERS = ["Lith", "Meso", "Neo", "Axi", "Requiem", "Omnia"] as const;
type Tier = (typeof TIERS)[number];
const MISSION_TYPES = ["Survival", "Defense", "Capture", "Exterminate", "Rescue", "Interception"];
const WORLDS = ["cetus", "vallis", "cambion", "earth", "duviri", "zariman"] as const;
const KIND_LABELS: Record<EventKind, string> = {
  fissure: "Fissure",
  invasion: "Invasion",
  alert: "Alert",
  baro: "Baro Ki'Teer",
  sortie: "Sortie",
  archonHunt: "Archon Hunt",
  cycle: "World cycle",
  nightwave: "Nightwave",
};

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs";

function CheckboxGroup({
  legend,
  options,
  values,
  onChange,
}: {
  legend: string;
  options: readonly string[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={values.includes(o)}
              onChange={(e) => onChange(e.target.checked ? [...values, o] : values.filter((v) => v !== o))}
            />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function RuleForm({
  initial,
  submitLabel = "Save rule",
  onSubmit,
}: {
  initial?: RuleInput;
  submitLabel?: string;
  onSubmit: (input: RuleInput) => void | Promise<void>;
}) {
  const f = initial?.filter;
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<EventKind>(initial?.filter.kind ?? "fissure");
  const [tiers, setTiers] = useState<string[]>(
    f && f.kind === "fissure" ? (f.tiers ?? []) : [],
  );
  const [missionTypes, setMissionTypes] = useState<string[]>(
    f && (f.kind === "fissure" || f.kind === "sortie") ? (f.missionTypes ?? []) : [],
  );
  // Three states, because "I do not care" is not the same as "not Steel Path".
  const [steelPath, setSteelPath] = useState<"any" | "only" | "exclude">(() => {
    if (f?.kind !== "fissure" || f.steelPath === null) return "any";
    return f.steelPath ? "only" : "exclude";
  });
  // rewards, items or bosses, one list because only one is shown per kind
  const [names, setNames] = useState<string[]>(() => {
    if (!f) return [];
    if (f.kind === "invasion" || f.kind === "alert") return f.rewards ?? [];
    if (f.kind === "baro") return f.items ?? [];
    if (f.kind === "sortie" || f.kind === "archonHunt") return f.boss ?? [];
    return [];
  });
  const [world, setWorld] = useState<(typeof WORLDS)[number]>(
    f?.kind === "cycle" ? f.world : "cetus",
  );
  const [cycleState, setCycleState] = useState(f?.kind === "cycle" ? f.state : "night");
  const [mode, setMode] = useState<"instant" | "digest">(initial?.mode ?? "instant");
  const [channels, setChannels] = useState<string[]>(initial?.channels ?? ["email"]);
  const [error, setError] = useState<string | null>(null);

  const some = (v: string[]) => (v.length ? v : null);

  function buildFilter(): RuleFilter {
    switch (kind) {
      case "fissure":
        return {
          kind,
          tiers: some(tiers) as Tier[] | null,
          missionTypes: some(missionTypes),
          steelPath: steelPath === "any" ? null : steelPath === "only",
          storm: null,
        };
      case "invasion":
      case "alert":
        return { kind, rewards: some(names) };
      case "baro":
        return { kind, items: some(names) };
      case "sortie":
        return { kind, boss: some(names), missionTypes: some(missionTypes) };
      case "archonHunt":
        return { kind, boss: some(names) };
      case "cycle":
        return { kind, world, state: cycleState };
      case "nightwave":
        return { kind };
    }
  }

  async function submit() {
    const parsed = RuleInput.safeParse({ name, filter: buildFilter(), mode, channels });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Rule is not valid");
      return;
    }
    setError(null);
    await onSubmit(parsed.data);
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="rule-name">Name</Label>
        <Input id="rule-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="rule-kind">Event kind</Label>
        <select
          id="rule-kind"
          className={selectClass}
          value={kind}
          onChange={(e) => setKind(e.target.value as EventKind)}
        >
          {EVENT_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {kind === "fissure" && (
        <>
          <CheckboxGroup legend="Relic tiers" options={TIERS} values={tiers} onChange={setTiers} />
          <CheckboxGroup
            legend="Mission types"
            options={MISSION_TYPES}
            values={missionTypes}
            onChange={setMissionTypes}
          />
          <div className="grid gap-2">
            <Label htmlFor="steel-path">Steel Path</Label>
            <select
              id="steel-path"
              className={selectClass}
              value={steelPath}
              onChange={(e) => setSteelPath(e.target.value as "any" | "only" | "exclude")}
            >
              <option value="any">Any</option>
              <option value="only">Steel Path only</option>
              <option value="exclude">Exclude Steel Path</option>
            </select>
          </div>
        </>
      )}

      {(kind === "invasion" || kind === "alert") && (
        <TagInput label="Rewards" values={names} onChange={setNames} />
      )}
      {kind === "baro" && <TagInput label="Items" values={names} onChange={setNames} />}
      {(kind === "sortie" || kind === "archonHunt") && (
        <TagInput label="Bosses" values={names} onChange={setNames} />
      )}
      {kind === "sortie" && (
        <CheckboxGroup
          legend="Mission types"
          options={MISSION_TYPES}
          values={missionTypes}
          onChange={setMissionTypes}
        />
      )}
      {kind === "cycle" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="cycle-world">World</Label>
            <select
              id="cycle-world"
              className={selectClass}
              value={world}
              onChange={(e) => setWorld(e.target.value as (typeof WORLDS)[number])}
            >
              {WORLDS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cycle-state">State</Label>
            <Input id="cycle-state" value={cycleState} onChange={(e) => setCycleState(e.target.value)} />
          </div>
        </div>
      )}

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Delivery</legend>
        <div className="flex gap-4">
          {(["instant", "digest"] as const).map((m) => (
            <label key={m} className="flex items-center gap-1.5 text-sm">
              <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />
              {m === "instant" ? "Instant" : "Hourly digest"}
            </label>
          ))}
        </div>
      </fieldset>

      <CheckboxGroup legend="Channels" options={["email", "imessage"]} values={channels} onChange={setChannels} />

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
