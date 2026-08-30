import type { ModDef, Polarity, Slots } from "@/lib/builds/capacity";

export type BuildItem = {
  uniqueName: string;
  name: string;
  kind: string;
  stats?: { health: number; shield: number; armor: number; energy: number; sprint: number };
};

export type BuildRow = {
  _id: string;
  itemId: string;
  itemName: string;
  name: string;
  slots: Slots;
  forma: number;
  orokinReactor: boolean;
  notes: string;
  public: boolean;
  createdAt: number;
  updatedAt: number;
  mine: boolean;
};

export type BuildDraft = {
  itemId: string;
  name: string;
  slots: Slots;
  forma: number;
  orokinReactor: boolean;
  notes: string;
  public: boolean;
};

// The game draws a symbol per polarity. One letter each keeps the grid black and white.
export const POLARITY_SYMBOL: Record<Polarity, string> = {
  madurai: "V",
  vazarin: "D",
  naramon: "—",
  zenurik: "=",
  unairu: "Ω",
  penjaga: "Ψ",
  umbra: "U",
  universal: "✲",
  any: "·",
};

export const POLARITIES: Polarity[] = [
  "madurai",
  "vazarin",
  "naramon",
  "zenurik",
  "unairu",
  "penjaga",
  "umbra",
  "universal",
];

export const STAT_LABELS: Record<string, string> = {
  health: "Health",
  shield: "Shields",
  armor: "Armor",
  energy: "Energy",
  sprint: "Sprint",
  duration: "Duration",
  efficiency: "Efficiency",
  range: "Range",
  strength: "Strength",
};

export function catalogOf(mods: ModDef[] | undefined): Map<string, ModDef> {
  return new Map((mods ?? []).map((mod) => [mod.uniqueName, mod]));
}

// Where a fresh, unsaved draft waits while the reader is sent to the editor.
export const DRAFT_KEY = "voidwatch:build-draft";
