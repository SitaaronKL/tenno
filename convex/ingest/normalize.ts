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

// Raw upstream JSON is loosely typed on purpose, every field here is optional upstream.
type Raw = Record<string, any>;

const CYCLE_KEYS: { key: string; world: Cycle["world"] }[] = [
  { key: "cetusCycle", world: "cetus" },
  { key: "vallisCycle", world: "vallis" },
  { key: "cambionCycle", world: "cambion" },
  { key: "earthCycle", world: "earth" },
  { key: "duviriCycle", world: "duviri" },
  { key: "zarimanCycle", world: "zariman" },
];

const TIERS: Fissure["tier"][] = ["Lith", "Meso", "Neo", "Axi", "Requiem", "Omnia"];

function ms(value: unknown): number {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function list(value: unknown): Raw[] {
  return Array.isArray(value) ? value : [];
}

// Upstream splits a reward into items, countedItems and credits, panels want one flat list.
function rewards(raw: Raw | undefined | null): Reward[] {
  if (!raw) return [];
  const out: Reward[] = [];
  for (const item of list(raw.items)) out.push({ item: String(item), count: 1, credits: 0 });
  for (const counted of list(raw.countedItems)) {
    out.push({ item: String(counted.type ?? ""), count: Number(counted.count ?? 1), credits: 0 });
  }
  if (Number(raw.credits ?? 0) > 0) out.push({ item: "Credits", count: 1, credits: Number(raw.credits) });
  return out;
}

function firstReward(raw: Raw | undefined | null): Reward | null {
  return rewards(raw)[0] ?? null;
}

function fissures(raw: Raw): Fissure[] {
  return list(raw.fissures).map((f) => ({
    key: String(f.id ?? ""),
    node: String(f.node ?? ""),
    missionType: String(f.missionTypeKey ?? f.missionType ?? ""),
    enemy: String(f.enemyKey ?? f.enemy ?? ""),
    tier: TIERS.includes(f.tier) ? f.tier : TIERS[Number(f.tierNum ?? 1) - 1] ?? "Lith",
    steelPath: Boolean(f.isHard),
    storm: Boolean(f.isStorm),
    startsAt: ms(f.activation),
    expiresAt: ms(f.expiry),
  }));
}

function alerts(raw: Raw): Alert[] {
  return list(raw.alerts).map((a) => {
    const mission: Raw = a.mission ?? {};
    return {
      key: String(a.id ?? ""),
      node: String(mission.node ?? ""),
      missionType: String(mission.typeKey ?? mission.type ?? ""),
      enemy: String(mission.factionKey ?? mission.faction ?? ""),
      rewards: rewards(mission.reward),
      startsAt: ms(a.activation),
      expiresAt: ms(a.expiry),
    };
  });
}

function invasions(raw: Raw): Invasion[] {
  return list(raw.invasions)
    .filter((i) => !i.completed)
    .map((i) => ({
      key: String(i.id ?? ""),
      node: String(i.node ?? ""),
      description: String(i.desc ?? ""),
      attacker: {
        faction: String(i.attacker?.factionKey ?? i.attacker?.faction ?? ""),
        reward: firstReward(i.attacker?.reward),
      },
      defender: {
        faction: String(i.defender?.factionKey ?? i.defender?.faction ?? ""),
        reward: firstReward(i.defender?.reward),
      },
      completion: Number(i.completion ?? 0),
      startsAt: ms(i.activation),
    }));
}

function sortie(raw: Raw): Sortie | null {
  const s: Raw | undefined = raw.sortie;
  if (!s?.id) return null;
  return {
    key: String(s.id),
    boss: String(s.boss ?? ""),
    faction: String(s.faction ?? ""),
    missions: list(s.variants).map((v) => ({
      node: String(v.node ?? ""),
      missionType: String(v.missionTypeKey ?? v.missionType ?? ""),
      modifier: String(v.modifier ?? ""),
    })),
    startsAt: ms(s.activation),
    expiresAt: ms(s.expiry),
  };
}

// Archon hunt uses missions[] with type, sortie uses variants[] with missionType.
function archonHunt(raw: Raw): ArchonHunt | null {
  const a: Raw | undefined = raw.archonHunt;
  if (!a?.id) return null;
  return {
    key: String(a.id),
    boss: String(a.boss ?? ""),
    faction: String(a.faction ?? ""),
    missions: list(a.missions).map((m) => ({
      node: String(m.node ?? ""),
      missionType: String(m.typeKey ?? m.type ?? ""),
      modifier: "",
    })),
    startsAt: ms(a.activation),
    expiresAt: ms(a.expiry),
  };
}

function baro(raw: Raw, fetchedAt: number): Baro | null {
  const b: Raw | undefined = raw.voidTrader;
  if (!b?.id) return null;
  const startsAt = ms(b.activation);
  return {
    key: String(b.id) + ":" + startsAt,
    location: String(b.location ?? ""),
    active: startsAt <= fetchedAt && fetchedAt < ms(b.expiry),
    startsAt,
    expiresAt: ms(b.expiry),
    inventory: list(b.inventory).map((i) => ({
      item: String(i.item ?? ""),
      ducats: Number(i.ducats ?? 0),
      credits: Number(i.credits ?? 0),
    })),
  };
}

function nightwave(raw: Raw): Nightwave | null {
  const n: Raw | undefined = raw.nightwave;
  if (!n?.id) return null;
  return {
    season: Number(n.season ?? 0),
    expiresAt: ms(n.expiry),
    acts: list(n.activeChallenges).map((c) => ({
      key: String(c.id ?? ""),
      title: String(c.title ?? ""),
      description: String(c.desc ?? ""),
      reputation: Number(c.reputation ?? 0),
      daily: Boolean(c.isDaily),
      expiresAt: ms(c.expiry),
    })),
  };
}

function cycles(raw: Raw): Cycle[] {
  const out: Cycle[] = [];
  for (const { key, world } of CYCLE_KEYS) {
    const c: Raw | undefined = raw[key];
    if (!c?.state) continue;
    out.push({ world, state: String(c.state), expiresAt: ms(c.expiry) });
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
