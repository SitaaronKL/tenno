// Normalized world state. This is what convex/ingest writes and what every UI panel reads.
// Raw api.warframestat.us shapes never leave convex/ingest/normalize.ts.

export type Platform = "pc";

export interface Fissure {
  key: string; // upstream id
  node: string;
  missionType: string;
  enemy: string;
  tier: "Lith" | "Meso" | "Neo" | "Axi" | "Requiem" | "Omnia";
  steelPath: boolean;
  storm: boolean;
  startsAt: number; // ms epoch
  expiresAt: number;
}

export interface Reward { item: string; count: number; credits: number }

export interface Alert {
  key: string; node: string; missionType: string; enemy: string;
  rewards: Reward[]; startsAt: number; expiresAt: number;
}

export interface Invasion {
  key: string; node: string; description: string;
  attacker: { faction: string; reward: Reward | null };
  defender: { faction: string; reward: Reward | null };
  completion: number; // 0..100
  startsAt: number;
}

export interface Sortie {
  key: string; boss: string; faction: string;
  missions: { node: string; missionType: string; modifier: string }[];
  startsAt: number; expiresAt: number;
}

export type ArchonHunt = Sortie;

export interface Baro {
  key: string; location: string; active: boolean;
  startsAt: number; expiresAt: number;
  inventory: { item: string; ducats: number; credits: number }[];
}

export interface Nightwave {
  season: number; expiresAt: number;
  acts: { key: string; title: string; description: string; reputation: number; daily: boolean; expiresAt: number }[];
}

export interface Cycle {
  world: "cetus" | "vallis" | "cambion" | "earth" | "duviri" | "zariman";
  state: string;
  expiresAt: number;
}

export interface WorldState {
  platform: Platform;
  fetchedAt: number;
  upstreamTimestamp: number; // when upstream says the snapshot was built
  stale: boolean; // upstream is more than ten minutes behind

  fissures: Fissure[];
  alerts: Alert[];
  invasions: Invasion[];
  sortie: Sortie | null;
  archonHunt: ArchonHunt | null;
  baro: Baro | null;
  nightwave: Nightwave | null;
  cycles: Cycle[];
}
