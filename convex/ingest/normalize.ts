import type {
  Alert,
  ArchonHunt,
  Baro,
  Cycle,
  Fissure,
  Invasion,
  Nightwave,
  Reward,
  Sortie,
  WorldState,
} from "../../lib/contracts/worldstate";

// Raw upstream JSON is unknown shaped, every field is read through the coercers below.
type Raw = Record<string, unknown>;

const CYCLE_KEYS: { key: string; world: Cycle["world"] }[] = [
  { key: "cetusCycle", world: "cetus" },
  { key: "vallisCycle", world: "vallis" },
  { key: "cambionCycle", world: "cambion" },
  { key: "earthCycle", world: "earth" },
  { key: "duviriCycle", world: "duviri" },
  { key: "zarimanCycle", world: "zariman" },
];

const TIERS: Fissure["tier"][] = ["Lith", "Meso", "Neo", "Axi", "Requiem", "Omnia"];

function rec(value: unknown): Raw {
  return value !== null && typeof value === "object" ? (value as Raw) : {};
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function objects(value: unknown): Raw[] {
  return arr(value).map(rec);
}

function str(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ms(value: unknown): number {
  const parsed = Date.parse(str(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Upstream splits a reward into items, countedItems and credits, panels want one flat list.
function rewards(value: unknown): Reward[] {
  const raw = rec(value);
  const out: Reward[] = [];
  for (const item of arr(raw.items)) out.push({ item: str(item), count: 1, credits: 0 });
  for (const counted of objects(raw.countedItems)) {
    out.push({ item: str(counted.type), count: num(counted.count, 1), credits: 0 });
  }
  if (num(raw.credits) > 0) out.push({ item: "Credits", count: 1, credits: num(raw.credits) });
  return out;
}

function firstReward(value: unknown): Reward | null {
  return rewards(value)[0] ?? null;
}

function tier(f: Raw): Fissure["tier"] {
  const named = TIERS.find((t) => t === f.tier);
  return named ?? TIERS[num(f.tierNum, 1) - 1] ?? "Lith";
}

function fissures(raw: Raw): Fissure[] {
  return objects(raw.fissures).map((f) => ({
    key: str(f.id),
    node: str(f.node),
    missionType: str(f.missionTypeKey ?? f.missionType),
    enemy: str(f.enemyKey ?? f.enemy),
    tier: tier(f),
    steelPath: Boolean(f.isHard),
    storm: Boolean(f.isStorm),
    startsAt: ms(f.activation),
    expiresAt: ms(f.expiry),
  }));
}

function alerts(raw: Raw): Alert[] {
  return objects(raw.alerts).map((a) => {
    const mission = rec(a.mission);
    return {
      key: str(a.id),
      node: str(mission.node),
      missionType: str(mission.typeKey ?? mission.type),
      enemy: str(mission.factionKey ?? mission.faction),
      rewards: rewards(mission.reward),
      startsAt: ms(a.activation),
      expiresAt: ms(a.expiry),
    };
  });
}

function invasions(raw: Raw): Invasion[] {
  return objects(raw.invasions)
    .filter((i) => !i.completed)
    .map((i) => ({
      key: str(i.id),
      node: str(i.node),
      description: str(i.desc),
      attacker: {
        faction: str(rec(i.attacker).factionKey ?? rec(i.attacker).faction),
        reward: firstReward(rec(i.attacker).reward),
      },
      defender: {
        faction: str(rec(i.defender).factionKey ?? rec(i.defender).faction),
        reward: firstReward(rec(i.defender).reward),
      },
      completion: num(i.completion),
      startsAt: ms(i.activation),
    }));
}

function sortie(raw: Raw): Sortie | null {
  const s = rec(raw.sortie);
  if (!s.id) return null;
  return {
    key: str(s.id),
    boss: str(s.boss),
    faction: str(s.faction),
    missions: objects(s.variants).map((v) => ({
      node: str(v.node),
      missionType: str(v.missionTypeKey ?? v.missionType),
      modifier: str(v.modifier),
    })),
    startsAt: ms(s.activation),
    expiresAt: ms(s.expiry),
  };
}

// Archon hunt uses missions[] with type, sortie uses variants[] with missionType.
function archonHunt(raw: Raw): ArchonHunt | null {
  const a = rec(raw.archonHunt);
  if (!a.id) return null;
  return {
    key: str(a.id),
    boss: str(a.boss),
    faction: str(a.faction),
    missions: objects(a.missions).map((m) => ({
      node: str(m.node),
      missionType: str(m.typeKey ?? m.type),
      modifier: "",
    })),
    startsAt: ms(a.activation),
    expiresAt: ms(a.expiry),
  };
}

function baro(raw: Raw, at: number): Baro | null {
  const b = rec(raw.voidTrader);
  if (!b.id) return null;
  const startsAt = ms(b.activation);
  return {
    key: str(b.id) + ":" + startsAt,
    location: str(b.location),
    active: startsAt <= at && at < ms(b.expiry),
    startsAt,
    expiresAt: ms(b.expiry),
    inventory: objects(b.inventory).map((i) => ({
      item: str(i.item),
      ducats: num(i.ducats),
      credits: num(i.credits),
    })),
  };
}

function nightwave(raw: Raw): Nightwave | null {
  const n = rec(raw.nightwave);
  if (!n.id) return null;
  return {
    season: num(n.season),
    expiresAt: ms(n.expiry),
    acts: objects(n.activeChallenges).map((c) => ({
      key: str(c.id),
      title: str(c.title),
      description: str(c.desc),
      reputation: num(c.reputation),
      daily: Boolean(c.isDaily),
      expiresAt: ms(c.expiry),
    })),
  };
}

function cycles(raw: Raw): Cycle[] {
  const out: Cycle[] = [];
  for (const { key, world } of CYCLE_KEYS) {
    const c = rec(raw[key]);
    if (!c.state) continue;
    out.push({ world, state: str(c.state), expiresAt: ms(c.expiry) });
  }
  return out;
}

// Arbitration is dropped: upstream derives it and currently serves a broken placeholder.
export function normalize(raw: Raw, fetchedAt: number = Date.now()): WorldState {
  return {
    platform: "pc",
    fetchedAt,
    fissures: fissures(raw).filter((f) => f.expiresAt > fetchedAt),
    alerts: alerts(raw).filter((a) => a.expiresAt > fetchedAt),
    invasions: invasions(raw),
    sortie: sortie(raw),
    archonHunt: archonHunt(raw),
    baro: baro(raw, fetchedAt),
    nightwave: nightwave(raw),
    cycles: cycles(raw),
  };
}
