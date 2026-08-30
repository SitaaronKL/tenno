"use client";

import { useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/icons/chevron-down";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TagInput } from "@/components/rules/tag-input";
import { KIND_LABELS, joinOr } from "@/components/rules/sentence";
import { Segmented } from "@/components/segmented";
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
const CHANNEL_LABELS: Record<string, string> = { email: "Email", imessage: "iMessage" };

// Every bracket in the sentence is one of these chips.
function Chip({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`${label}: ${value}`}
        className="inline-flex h-7 items-center gap-1 rounded-full bg-surface-2 px-2.5 text-sm font-medium text-foreground ring-1 ring-border transition-colors duration-150 ease-out hover:bg-accent-soft hover:text-foreground"
      >
        {value}
        <ChevronDownIcon size={12} className="text-muted-foreground" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <p className="text-xs text-muted-foreground">{label}</p>
        {children}
      </PopoverContent>
    </Popover>
  );
}

function CheckboxList({
  options,
  values,
  onChange,
}: {
  options: readonly string[];
  values: string[];
  onChange: (next: string[]) => void;
  }) {
  return (
    <div className="grid gap-1.5">
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-foreground"
            checked={values.includes(o)}
            onChange={(e) => onChange(e.target.checked ? [...values, o] : values.filter((v) => v !== o))}
          />
          {o}
        </label>
      ))}
    </div>
  );
}

function RadioList<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="grid gap-1.5">
      {options.map((o) => (
        <label key={o.value} className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={name}
            className="accent-foreground"
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

// Three states, because "I do not care" is not the same as "not Steel Path".
const STEEL_PATH = [
  { value: "any", label: "Any" },
  { value: "only", label: "Only" },
  { value: "exclude", label: "Exclude" },
] as const;
type SteelPath = (typeof STEEL_PATH)[number]["value"];

// Void Storm is the Railjack half of a fissure, and it needs the same three states.
const STORM = [
  { value: "any", label: "Any" },
  { value: "only", label: "Only Void Storm" },
  { value: "exclude", label: "No Void Storm" },
] as const;
type Storm = (typeof STORM)[number]["value"];

function tristate(value: boolean | null): "any" | "only" | "exclude" {
  if (value === null) return "any";
  return value ? "only" : "exclude";
}

function fromTristate(value: "any" | "only" | "exclude"): boolean | null {
  return value === "any" ? null : value === "only";
}

export function RuleForm({
  initial,
  submitLabel = "Save rule",
  pending = false,
  onSubmit,
}: {
  initial?: RuleInput;
  submitLabel?: string;
  pending?: boolean;
  onSubmit: (input: RuleInput) => void | Promise<void>;
}) {
  const f = initial?.filter;
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<EventKind>(initial?.filter.kind ?? "fissure");
  const [tiers, setTiers] = useState<string[]>(f && f.kind === "fissure" ? (f.tiers ?? []) : []);
  const [missionTypes, setMissionTypes] = useState<string[]>(
    f && (f.kind === "fissure" || f.kind === "sortie") ? (f.missionTypes ?? []) : [],
  );
  const [steelPath, setSteelPath] = useState<SteelPath>(() =>
    f?.kind === "fissure" ? tristate(f.steelPath) : "any",
  );
  const [storm, setStorm] = useState<Storm>(() =>
    f?.kind === "fissure" ? tristate(f.storm) : "any",
  );
  // rewards, items or bosses, one list because only one is shown per kind
  const [names, setNames] = useState<string[]>(() => {
    if (!f) return [];
    if (f.kind === "invasion" || f.kind === "alert") return f.rewards ?? [];
    if (f.kind === "baro") return f.items ?? [];
    if (f.kind === "sortie" || f.kind === "archonHunt") return f.boss ?? [];
    return [];
  });
  const [world, setWorld] = useState<(typeof WORLDS)[number]>(f?.kind === "cycle" ? f.world : "cetus");
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
          steelPath: fromTristate(steelPath),
          storm: fromTristate(storm),
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

  const nameList = kind === "baro" ? "Items" : kind === "sortie" || kind === "archonHunt" ? "Bosses" : "Rewards";

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

      {/* The sentence is a flex row, so every chip and word sits on one baseline. */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 rounded-xl bg-surface-2 p-4 text-sm ring-1 ring-border">
        <span className="text-muted-foreground">When</span>
        <Chip label="Event kind" value={KIND_LABELS[kind]}>
          <RadioList
            name="rule-kind"
            value={kind}
            onChange={setKind}
            options={EVENT_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))}
          />
        </Chip>

        {kind === "fissure" && (
          <>
            <Chip label="Relic tiers" value={tiers.length ? joinOr(tiers) : "any tier"}>
              <CheckboxList options={TIERS} values={tiers} onChange={setTiers} />
            </Chip>
            <Chip label="Mission types" value={missionTypes.length ? joinOr(missionTypes) : "any mission"}>
              <CheckboxList options={MISSION_TYPES} values={missionTypes} onChange={setMissionTypes} />
            </Chip>
            <span className="text-muted-foreground">with Steel Path</span>
            <Segmented label="Steel Path" options={STEEL_PATH} value={steelPath} onChange={setSteelPath} />
            <span className="text-muted-foreground">and</span>
            <Segmented label="Void Storm" options={STORM} value={storm} onChange={setStorm} />
          </>
        )}

        {(kind === "invasion" || kind === "alert" || kind === "baro" || kind === "archonHunt") && (
          <>
            <Chip label={nameList} value={names.length ? joinOr(names) : `any ${nameList.toLowerCase()}`}>
              <TagInput label={nameList} values={names} onChange={setNames} />
            </Chip>
          </>
        )}

        {kind === "sortie" && (
          <>
            <Chip label="Bosses" value={names.length ? joinOr(names) : "any boss"}>
              <TagInput label="Bosses" values={names} onChange={setNames} />
            </Chip>
            <Chip label="Mission types" value={missionTypes.length ? joinOr(missionTypes) : "any mission"}>
              <CheckboxList options={MISSION_TYPES} values={missionTypes} onChange={setMissionTypes} />
            </Chip>
          </>
        )}

        {kind === "cycle" && (
          <>
            <Chip label="World" value={world}>
              <RadioList
                name="cycle-world"
                value={world}
                onChange={setWorld}
                options={WORLDS.map((w) => ({ value: w, label: w }))}
              />
            </Chip>
            <span className="text-muted-foreground">turns</span>
            <Chip label="State" value={cycleState || "any state"}>
              <div className="grid gap-2">
                <Label htmlFor="cycle-state" className="sr-only">
                  State
                </Label>
                <Input
                  id="cycle-state"
                  value={cycleState}
                  onChange={(e) => setCycleState(e.target.value)}
                />
              </div>
            </Chip>
          </>
        )}

        <span className="text-muted-foreground">then notify me by</span>
        <Chip
          label="Channels"
          value={channels.length ? joinOr(channels.map((c) => CHANNEL_LABELS[c] ?? c)) : "no channel"}
        >
          <CheckboxList
            options={["Email", "iMessage"]}
            values={channels.map((c) => CHANNEL_LABELS[c] ?? c)}
            onChange={(next) => setChannels(next.map((n) => (n === "Email" ? "email" : "imessage")))}
          />
        </Chip>
        <Chip label="Delivery" value={mode === "instant" ? "Instant" : "Hourly digest"}>
          <RadioList
            name="rule-mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "instant", label: "Instant" },
              { value: "digest", label: "Hourly digest" },
            ]}
          />
        </Chip>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : submitLabel}
      </Button>
    </form>
  );
}
