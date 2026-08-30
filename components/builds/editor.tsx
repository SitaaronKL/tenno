"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  emptySlots,
  summarize,
  MAX_ARCANES,
  MOD_SLOTS,
  type ModDef,
  type ModRef,
  type ModSlot,
  type Slots,
} from "@/lib/builds/capacity";
import { ItemCombobox } from "./item-combobox";
import { ModPicker } from "./mod-picker";
import { Slot, type SlotView } from "./slot-grid";
import { StatPreview } from "./stat-preview";
import { catalogOf, type BuildDraft, type BuildItem } from "./types";

type Target = { kind: ModSlot; index: number } | null;

export function newDraft(itemId = ""): BuildDraft {
  return {
    itemId,
    name: "",
    slots: emptySlots(),
    forma: 0,
    orokinReactor: false,
    notes: "",
    public: false,
  };
}

// Everything the editor needs arrives as props, so it renders the same in a test as in the app.
export function BuildEditor({
  initial,
  items,
  mods,
  mine = true,
  onSave,
  onFork,
  onRemove,
  shareUrl,
}: {
  initial: BuildDraft;
  items: BuildItem[];
  mods: ModDef[];
  mine?: boolean;
  onSave?: (draft: BuildDraft) => void;
  onFork?: () => void;
  onRemove?: () => void;
  shareUrl?: string;
}) {
  const [draft, setDraft] = useState<BuildDraft>(initial);
  const [target, setTarget] = useState<Target>(null);
  const [copied, setCopied] = useState(false);

  const catalog = useMemo(() => catalogOf(mods), [mods]);
  const item = items.find((row) => row.uniqueName === draft.itemId);
  const capacity = summarize(draft, catalog);

  function setSlots(next: (slots: Slots) => Slots) {
    setDraft((current) => ({ ...current, slots: next(structuredClone(current.slots)) }));
  }

  function put(kind: ModSlot, index: number, ref: ModRef | null) {
    setSlots((slots) => {
      if (kind === "aura") slots.aura = ref;
      else if (kind === "exilus") slots.exilus = ref;
      else if (kind === "arcane") {
        const next = [...slots.arcanes];
        if (ref) next[index] = ref;
        else next.splice(index, 1);
        // Filter first, dropping the second arcane while the first is empty would leave a hole.
        slots.arcanes = next.filter(Boolean).slice(0, MAX_ARCANES);
      } else slots.mods[index] = ref;
      return slots;
    });
  }

  function setRank(kind: ModSlot, index: number, rank: number) {
    setSlots((slots) => {
      const at =
        kind === "aura" ? slots.aura : kind === "exilus" ? slots.exilus : kind === "arcane" ? slots.arcanes[index] : slots.mods[index];
      if (at) at.rank = rank;
      return slots;
    });
  }

  // Forma stamps the slot with the polarity of whatever is sitting in it, the way the game does.
  function toggleForma(kind: ModSlot, index: number) {
    setDraft((current) => {
      const slots = structuredClone(current.slots);
      const ref = kind === "aura" ? slots.aura : kind === "exilus" ? slots.exilus : slots.mods[index];
      const now =
        kind === "aura"
          ? slots.polarities.aura
          : kind === "exilus"
            ? slots.polarities.exilus
            : slots.polarities.mods[index];
      const mod = ref ? catalog.get(ref.uniqueName) : undefined;
      const next = now ? null : (mod?.polarity ?? null);
      if (kind === "aura") slots.polarities.aura = next;
      else if (kind === "exilus") slots.polarities.exilus = next;
      else slots.polarities.mods[index] = next;
      const forma = Math.max(0, current.forma + (next ? 1 : -1));
      return { ...current, slots, forma };
    });
  }

  const views: (SlotView & { kind: ModSlot; index: number })[] = [
    {
      kind: "aura",
      index: 0,
      key: "aura",
      label: "Aura",
      ref: draft.slots.aura,
      polarity: draft.slots.polarities.aura,
    },
    {
      kind: "exilus",
      index: 0,
      key: "exilus",
      label: "Exilus",
      ref: draft.slots.exilus,
      polarity: draft.slots.polarities.exilus,
    },
    ...Array.from({ length: MOD_SLOTS }, (_, i) => ({
      kind: "mod" as ModSlot,
      index: i,
      key: `mod-${i}`,
      label: `Slot ${i + 1}`,
      ref: draft.slots.mods[i] ?? null,
      polarity: draft.slots.polarities.mods[i] ?? null,
    })),
    ...Array.from({ length: MAX_ARCANES }, (_, i) => ({
      kind: "arcane" as ModSlot,
      index: i,
      key: `arcane-${i}`,
      label: `Arcane ${i + 1}`,
      ref: draft.slots.arcanes[i] ?? null,
      polarity: null,
    })),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <ItemCombobox
            items={items}
            value={draft.itemId}
            onChange={(itemId) => setDraft((current) => ({ ...current, itemId }))}
          />
          <Input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="Build name"
            aria-label="Build name"
            className="h-8 w-56"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {views.map((view) => (
            <Slot
              key={view.key}
              view={view}
              mod={view.ref ? catalog.get(view.ref.uniqueName) : undefined}
              onOpen={() => setTarget({ kind: view.kind, index: view.index })}
              onRank={(rank) => setRank(view.kind, view.index, rank)}
              onForma={() => toggleForma(view.kind, view.index)}
            />
          ))}
        </div>

        <Textarea
          value={draft.notes}
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Notes"
          aria-label="Notes"
          rows={3}
        />
      </div>

      <aside className="space-y-4">
        <div
          className={cn(
            "rounded-lg border border-border bg-card p-4",
            capacity.over && "border-destructive",
          )}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Capacity</span>
            <span className="font-mono text-lg tabular-nums">
              {capacity.used}/{capacity.total}
            </span>
          </div>
          <p
            className={cn("mt-1 text-xs", capacity.over ? "text-destructive" : "text-muted-foreground")}
            role={capacity.over ? "alert" : undefined}
          >
            {capacity.over
              ? `Over capacity by ${-capacity.remaining}`
              : `${capacity.remaining} left`}
          </p>
          <label className="mt-3 flex items-center justify-between text-sm">
            <span>Orokin reactor</span>
            <Switch
              checked={draft.orokinReactor}
              onCheckedChange={(on) =>
                setDraft((current) => ({ ...current, orokinReactor: on === true }))
              }
              aria-label="Orokin reactor"
            />
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            Forma <span className="font-mono tabular-nums">{draft.forma}</span>
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-medium">Stats</h2>
          <StatPreview item={item} slots={draft.slots} catalog={catalog} />
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          <label className="flex items-center justify-between text-sm">
            <span>Public</span>
            <Switch
              checked={draft.public}
              onCheckedChange={(on) => setDraft((current) => ({ ...current, public: on === true }))}
              aria-label="Public"
            />
          </label>
          {shareUrl ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                void navigator.clipboard?.writeText(shareUrl);
                setCopied(true);
              }}
            >
              {copied ? "Link copied" : "Copy link"}
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {mine && onSave ? <Button onClick={() => onSave(draft)}>Save</Button> : null}
          {!mine && onFork ? <Button onClick={onFork}>Fork this build</Button> : null}
          {mine && onRemove ? (
            <Button variant="outline" onClick={onRemove}>
              Delete
            </Button>
          ) : null}
        </div>
      </aside>

      <ModPicker
        open={target !== null}
        slot={target?.kind ?? "mod"}
        mods={mods}
        onOpenChange={(open) => (open ? null : setTarget(null))}
        onClear={() => {
          if (target) put(target.kind, target.index, null);
          setTarget(null);
        }}
        onPick={(mod) => {
          if (target) put(target.kind, target.index, { uniqueName: mod.uniqueName, rank: mod.fusionLimit });
          setTarget(null);
        }}
      />
    </div>
  );
}
