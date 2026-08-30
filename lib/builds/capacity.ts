// Capacity, polarity and stat math for a build. Pure, no ctx, shared by the editor and the agent.

export type Polarity =
  | "madurai"
  | "vazarin"
  | "naramon"
  | "zenurik"
  | "unairu"
  | "penjaga"
  | "umbra"
  | "universal"
  | "any";

export type StatKey =
  | "health"
  | "shield"
  | "armor"
  | "energy"
  | "sprint"
  | "duration"
  | "efficiency"
  | "range"
  | "strength";

export type ModSlot = "mod" | "exilus" | "aura" | "arcane";

export type ModDef = {
  uniqueName: string;
  name: string;
  kind: "mod" | "arcane";
  polarity: Polarity;
  slot: ModSlot;
  baseDrain: number;
  fusionLimit: number;
  effects: { stat: StatKey; percent: number }[];
  // Display only, the picker prints them. The math never reads them.
  type?: string;
  rarity?: string;
  description?: string;
};

export type ModRef = { uniqueName: string; rank: number };
export type Shard = { color: string; count: number };

export type Slots = {
  aura: ModRef | null;
  exilus: ModRef | null;
  mods: (ModRef | null)[];
  arcanes: ModRef[];
  shards: Shard[];
  // Which polarity each slot carries. Forma is what puts one there.
  polarities: { aura: Polarity | null; exilus: Polarity | null; mods: (Polarity | null)[] };
};

export type BaseStats = {
  health: number;
  shield: number;
  armor: number;
  energy: number;
  sprint: number;
};

export type StatPreview = BaseStats & {
  duration: number;
  efficiency: number;
  range: number;
  strength: number;
};

export type Catalog = Map<string, ModDef>;

export const MOD_SLOTS = 8;
export const MAX_ARCANES = 2;
export const BASE_CAPACITY = 30;
export const REACTOR_CAPACITY = 60;
// The game stops counting efficiency past this, more only shows on the mods.
export const EFFICIENCY_CAP = 175;

export const SHARD_COLORS = ["azure", "crimson", "amber", "emerald", "topaz", "violet"];

export function emptySlots(): Slots {
  return {
    aura: null,
    exilus: null,
    mods: Array(MOD_SLOTS).fill(null),
    arcanes: [],
    shards: [],
    polarities: { aura: null, exilus: null, mods: Array(MOD_SLOTS).fill(null) },
  };
}

// A mod costs one more capacity a rank. An aura gives one more back a rank, so its drain is negative.
export function modDrain(mod: ModDef, rank: number): number {
  const clamped = Math.max(0, Math.min(rank, mod.fusionLimit));
  return mod.baseDrain < 0 ? mod.baseDrain - clamped : mod.baseDrain + clamped;
}

function matches(mod: ModDef, slot: Polarity | null): boolean {
  if (slot === null) return false;
  return slot === mod.polarity || slot === "universal" || mod.polarity === "universal";
}

// Matching polarity halves the drain, a mismatch adds a quarter, both rounded up like the game.
// A negative drain is a gift, not a cost, and a matching slot doubles it.
export function slotCost(mod: ModDef, rank: number, slot: Polarity | null): number {
  const drain = modDrain(mod, rank);
  if (drain < 0) return matches(mod, slot) ? drain * 2 : drain;
  if (matches(mod, slot)) return Math.ceil(drain / 2);
  if (slot === null) return drain;
  return Math.ceil(drain * 1.25);
}

export type CapacitySummary = {
  total: number;
  used: number;
  remaining: number;
  over: boolean;
};

// The aura sits outside the pool: it raises the total instead of spending it.
export function summarize(
  build: { slots: Slots; orokinReactor: boolean },
  catalog: Catalog,
): CapacitySummary {
  const { slots } = build;
  const aura = slots.aura ? catalog.get(slots.aura.uniqueName) : undefined;
  const auraBonus = aura ? -slotCost(aura, slots.aura!.rank, slots.polarities.aura) : 0;
  const total = (build.orokinReactor ? REACTOR_CAPACITY : BASE_CAPACITY) + auraBonus;

  let used = 0;
  const exilus = slots.exilus ? catalog.get(slots.exilus.uniqueName) : undefined;
  if (exilus) used += slotCost(exilus, slots.exilus!.rank, slots.polarities.exilus);
  slots.mods.forEach((ref, i) => {
    if (!ref) return;
    const mod = catalog.get(ref.uniqueName);
    if (mod) used += slotCost(mod, ref.rank, slots.polarities.mods[i] ?? null);
  });

  return { total, used, remaining: total - used, over: used > total };
}

// A mod's numbers scale linearly from rank 0 to its cap, so rank r is (r+1) of (max+1) shares.
export function effectAtRank(percent: number, rank: number, fusionLimit: number): number {
  const shares = fusionLimit + 1;
  const clamped = Math.max(0, Math.min(rank, fusionLimit));
  return (percent * (clamped + 1)) / shares;
}

function installed(slots: Slots): ModRef[] {
  return [slots.aura, slots.exilus, ...slots.mods, ...slots.arcanes].filter(
    (ref): ref is ModRef => ref !== null && ref !== undefined,
  );
}

// Warframe adds mod percentages together, it never multiplies them.
export function statTotals(slots: Slots, catalog: Catalog): Record<StatKey, number> {
  const totals = {
    health: 0,
    shield: 0,
    armor: 0,
    energy: 0,
    sprint: 0,
    duration: 0,
    efficiency: 0,
    range: 0,
    strength: 0,
  };
  for (const ref of installed(slots)) {
    const mod = catalog.get(ref.uniqueName);
    if (!mod) continue;
    for (const effect of mod.effects) {
      totals[effect.stat] += effectAtRank(effect.percent, ref.rank, mod.fusionLimit);
    }
  }
  return totals;
}

// Only frames have base stats, so this is the frame preview. Shards are not in it yet.
export function previewStats(base: BaseStats, slots: Slots, catalog: Catalog): StatPreview {
  const totals = statTotals(slots, catalog);
  const scale = (value: number, percent: number) => value * (1 + percent / 100);
  return {
    health: Math.round(scale(base.health, totals.health)),
    shield: Math.round(scale(base.shield, totals.shield)),
    armor: Math.round(scale(base.armor, totals.armor)),
    energy: Math.round(scale(base.energy, totals.energy)),
    // Two decimals through a fixed string, 0.95 times 1.3 lands just under 1.235 in binary.
    sprint: Math.round(Number((scale(base.sprint, totals.sprint) * 100).toFixed(6))) / 100,
    duration: Math.round(100 + totals.duration),
    efficiency: Math.min(EFFICIENCY_CAP, Math.round(100 + totals.efficiency)),
    range: Math.round(100 + totals.range),
    strength: Math.round(100 + totals.strength),
  };
}
