import type { RuleFilter } from "../lib/contracts/rule";

// One world event as stored in worldEvents. Payload shapes come from lib/contracts/worldstate.
export type MatchEvent = { kind: string; payload: unknown };

type Rec = Record<string, unknown>;

const rec = (value: unknown): Rec => (value && typeof value === "object" ? (value as Rec) : {});
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const str = (value: unknown): string => (typeof value === "string" ? value : "");

// Item names arrive with upstream casing and punctuation, so match loosely.
function containsAny(needles: string[] | null, haystacks: string[]): boolean {
  if (needles === null || needles.length === 0) return true;
  return needles.some((needle) => {
    const n = needle.trim().toLowerCase();
    return n.length > 0 && haystacks.some((hay) => hay.toLowerCase().includes(n));
  });
}

// Upstream never agrees on the verb or the noun, Entrati says Assassinate while Hex says
// Assassination, so both sides of a compare collapse to one spelling.
const SYNONYMS: Record<string, string> = {
  exterminate: "extermination",
  assassinate: "assassination",
};

function canon(value: string): string {
  const lowered = value.trim().toLowerCase();
  return SYNONYMS[lowered] ?? lowered;
}

function oneOf(allowed: string[] | null, value: string): boolean {
  if (allowed === null || allowed.length === 0) return true;
  return allowed.some((a) => canon(a) === canon(value));
}

const some = (values: string[] | null): string[] | null =>
  values && values.length > 0 ? values : null;

function rewardItems(reward: unknown): string[] {
  const r = rec(reward);
  return [str(r.item)].filter((s) => s.length > 0);
}

export function matches(filter: RuleFilter, event: MatchEvent): boolean {
  if (filter.kind !== event.kind) return false;
  const p = rec(event.payload);

  switch (filter.kind) {
    case "fissure": {
      if (!oneOf(filter.tiers, str(p.tier))) return false;
      if (!oneOf(filter.missionTypes, str(p.missionType))) return false;
      if (filter.steelPath !== null && filter.steelPath !== Boolean(p.steelPath)) return false;
      if (filter.storm !== null && filter.storm !== Boolean(p.storm)) return false;
      return true;
    }
    case "invasion": {
      const items = [rec(p.attacker).reward, rec(p.defender).reward].flatMap(rewardItems);
      return containsAny(filter.rewards, items);
    }
    case "alert": {
      const items = arr(p.rewards).flatMap(rewardItems);
      return containsAny(filter.rewards, items);
    }
    case "baro": {
      const items = arr(p.inventory).map((entry) => str(rec(entry).item));
      // Baro with an empty inventory is an arrival announcement, which a null filter wants.
      if (filter.items === null || filter.items.length === 0) return true;
      return containsAny(filter.items, items);
    }
    case "sortie":
    case "archonHunt": {
      if (!oneOf(filter.boss, str(p.boss))) return false;
      if (filter.kind === "archonHunt") return true;
      const missions = arr(p.missions).map(rec);
      const modifiers = filter.modifiers ?? null;
      if (modifiers !== null && modifiers.length > 0) {
        // The modifier text is a phrase, so a loose contains beats an exact compare.
        if (!containsAny(modifiers, missions.map((m) => str(m.modifier)))) return false;
      }
      if (filter.missionTypes === null || filter.missionTypes.length === 0) return true;
      return missions.some((m) => oneOf(filter.missionTypes, str(m.missionType)));
    }
    case "cycle": {
      if (str(p.world).toLowerCase() !== filter.world.toLowerCase()) return false;
      return str(p.state).toLowerCase() === filter.state.trim().toLowerCase();
    }
    case "nightwave":
      return true;
    case "bounty": {
      if (!oneOf(filter.syndicates, str(p.syndicate))) return false;
      const jobs = arr(p.jobs).map(rec);
      // Level is the job's position on the board, 1 is the row the game lists first.
      // "top" is the hardest bracket: the last row on a five row board, and the last two on
      // the seven row boards, where Hex and Cavia print a pair at the highest level band.
      const wanted =
        filter.level === null
          ? jobs
          : filter.level === "top"
            ? jobs.slice(jobs.length >= 7 ? -2 : -1)
            : jobs.slice(filter.level - 1, filter.level);
      if (wanted.length === 0) return false;
      if (filter.missionTypes === null || filter.missionTypes.length === 0) return true;
      return wanted.some((j) => oneOf(filter.missionTypes, str(j.missionType)));
    }
    case "archimedea": {
      if (filter.variant !== null && filter.variant !== str(p.variant)) return false;
      const missions = arr(p.missions).map(rec);
      const deviations = some(filter.deviations);
      if (deviations && !containsAny(deviations, missions.map((m) => str(m.deviation)))) return false;
      const risks = some(filter.risks);
      if (risks) {
        // Elite's extra risks are part of the week too, a player filtering on one wants both forms.
        const all = missions.flatMap((m) => arr(m.risks).map(str)).concat(arr(p.eliteBonus).map(str));
        if (!containsAny(risks, all)) return false;
      }
      return true;
    }
    case "arbitration": {
      if (!oneOf(filter.missionTypes, str(p.missionType))) return false;
      // An unrated node carries no tier, so it can never satisfy a tier filter.
      if (some(filter.tiers) !== null && str(p.tier) === "") return false;
      return oneOf(filter.tiers, str(p.tier));
    }
    case "reset":
      return str(p.period) === filter.period;
  }
}
