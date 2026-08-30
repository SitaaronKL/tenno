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

// One bounty on a syndicate board. Level is the range the board prints, standing is the whole run.
export interface BountyJob {
  level: string; // "5 - 15"
  minLevel: number;
  maxLevel: number;
  standing: number;
  rewards: string[];
  // Derived from DE's job path, absent when the job carries none, like an Isolation Vault run.
  missionType?: string;
  // What the board prints above the level, only set when the level alone does not name the job.
  title?: string;
  // The drop table behind a fixed board, per rotation. Absent on live boards, upstream sends no odds.
  rewardTable?: RewardChances[];
}

// One rotation of a fixed board's reward pool, chance is a percentage.
export interface RewardChances {
  rotation: string; // "A" | "B" | "C"
  rewards: { item: string; chance: number }[];
}

export interface Bounty {
  syndicate: string;
  node: string;
  expiresAt: number;
  jobs: BountyJob[];
  // Filled from the drop tables because upstream lists this board with no jobs. Absent on live boards.
  static?: boolean;
}

// One mission in a weekly Archimedea set. DE ships no star chart node for these, so node is optional.
export interface ArchimedeaMission {
  missionType: string;
  node?: string;
  deviation: string;
  risks: string[];
}

// Deep Archimedea (Sanctum Anatomica, Cavia) and Temporal Archimedea (Hollvania, The Hex).
export interface Archimedea {
  key: string;
  variant: "deep" | "temporal";
  expiresAt: number;
  missions: ArchimedeaMission[];
  personalModifiers: string[];
  // What elite adds on top of each mission's risks, one entry per mission in the same order.
  // Several extra risks on one mission read as one comma joined entry so the order still lines up.
  eliteBonus?: string[];
}

export interface Cycle {
  world: "cetus" | "vallis" | "cambion" | "earth" | "duviri" | "zariman";
  state: string;
  // The absolute boundary this phase began on. Optional so cycles stored before it existed read back.
  startsAt?: number;
  expiresAt: number;
}

// Which upstream answered. Optional so rows written before the DE fallback still read back.
export type Source = "warframestat" | "de";

export interface WorldState {
  platform: Platform;
  fetchedAt: number;
  source?: Source;
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
  // Optional so world state rows written before bounties existed still read back.
  bounties?: Bounty[];
  // Optional so world state rows written before Archimedea existed still read back.
  archimedea?: Archimedea[];
}
