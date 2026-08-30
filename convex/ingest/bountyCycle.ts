import type { Bounty, BountyCycle, BountyJob, WorldState } from "../../lib/contracts/worldstate";
import { nodeMissionType, nodeName } from "./names";

// DE's world state lists the Zariman, Cavia and Hex boards with no jobs at all, so the drop tables
// are the only thing that fills them and every row reads "Bounty". browse.wf's oracle watches the
// game and publishes the node and the bonus objective per rotation, which is what this maps in.
// Credit and cache notes are in docs/de-endpoints.md section 5b.
export const BOUNTY_CYCLE_ENDPOINT = "https://oracle.browse.wf/bounty-cycle";

// The oracle keys a board by DE's syndicate tag, our panels key it by the name people read.
const BOARDS: Record<string, string> = {
  ZarimanSyndicate: "The Holdfasts",
  EntratiLabSyndicate: "Cavia",
  HexSyndicate: "The Hex",
};

// Every challenge stem the three boards use, from browse.wf's ExportChallenges, read as a phrase.
// A stem missing here still reads, the camel case fallback below splits it into words.
const CHALLENGES: Record<string, string> = {
  AbilityKill: "Kill with abilities",
  ActivateConduitsQuick: "Activate two conduits fast",
  ActivateLohkSurge: "Activate Lohk surges",
  AlchemyGrenadeElectric: "Alchemy, electric amphors",
  AlchemyGrenadeFire: "Alchemy, fire amphors",
  AlchemyGrenadeIce: "Alchemy, cold amphors",
  AlchemyGrenadeToxin: "Alchemy, toxin amphors",
  AssassinateCollectScrapCrates: "Assassinate, collect scrap",
  AssassinateKillAngels: "Assassinate, kill the Angels",
  AssassinateUseAllTurrets: "Assassinate, use every turret",
  CaptureTargets: "Capture Legacytes",
  CascadeCompleteWaves: "Void Cascade, complete waves",
  CollectTears: "Collect Murmur Eyes",
  CorruptionCollectLargeOrbs: "Void Flood, collect large orbs",
  CorruptionCollectOrbs: "Void Flood, collect orbs",
  CorruptionKeepMeterLow: "Void Flood, keep the meter low",
  DefeatDoppelganger: "Defeat the Whisper",
  DefeatVoidAngel: "Defeat the Void Angel",
  DefenseActivatePillar: "Defense, activate the pillars",
  DestroyBackpacks: "Destroy Scaldra backpacks",
  DestroyDecoration: "Destroy decorations",
  DestroyDemolystLimbs: "Destroy Demolisher limbs",
  DestroyHazards: "Destroy Efervon containers",
  DestroyProps: "Destroy stationary items",
  DestroySpeakers: "Destroy the speakers",
  DestroyVehicles: "Destroy automobiles",
  ExplodingInfested: "Techrot explode on death",
  ExterminateFastComplete: "Exterminate fast",
  ExterminateNoPowers: "Exterminate without abilities",
  FindMelicaCache: "Find the Melica cache",
  FloodCompleteWaves: "Void Flood, complete waves",
  HighKill: "Kill from high ground",
  InfestedCrossfire: "Infested crossfire",
  KeepBarracksAlive: "Keep the barracks alive",
  KillAsOperator: "Kill as the Operator",
  KillCorpus: "Kill Corpus",
  KillFlyingMurmur: "Kill flying Murmur",
  KillGrineer: "Kill Grineer",
  KillMurmur: "Kill Murmur",
  KillVialedEnemy: "Douse enemies with Vitriol",
  KillVoidRig: "Kill rogue Voidrigs",
  LootCrates: "Find the sarcophages",
  Mercy: "Kill with finishers",
  MobDefProtectShields: "Mobile Defense, protect the shields",
  NearConduitVulnerability: "Demolishers invulnerable far from the conduit",
  RangedMechWeakpoint: "Destroy Culverin weak points",
  SafeCracker: "Open the Techrot safe",
  SixMinute: "Finish in six minutes",
  SummonNecramech: "Summon a Necramech",
  SurvivalAbove50: "Survival, stay above fifty",
  UnstableDockets: "Dockets disappear fast",
  UseVoidRifts: "Use the Void rifts",
};

// The board prefix and the difficulty suffix say nothing a player needs, the stem is the objective.
const PREFIX = /^(LichVania|EntratiLab|Zariman|Vania)/;
const SUFFIX = /(VeryHard|Hard|Normal|Easy)$/;

// First word capitalised, the rest lower, so "RideTheBus" reads as a sentence and not a title.
function splitCamel(stem: string): string {
  const words = stem.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(" ");
  return words
    .map((word, i) => (i === 0 ? word : word.toLowerCase()))
    .join(" ");
}

export function challengeLabel(path: string): string {
  const name = path.split("/").pop() ?? "";
  if (name === "") return "";
  const stem = name.replace(/Challenge$/, "").replace(PREFIX, "").replace(SUFFIX, "");
  if (stem === "") return "";
  return CHALLENGES[stem] ?? splitCamel(stem);
}

function isEntry(value: unknown): value is { node: string; challenge: string; ally?: string } {
  const row = value as Record<string, unknown>;
  return typeof row?.node === "string" && typeof row?.challenge === "string";
}

// The oracle is one person's server, so a shape we do not recognise is no answer rather than a crash.
export function parseCycle(value: unknown): BountyCycle | null {
  const raw = value as Record<string, unknown>;
  if (typeof raw?.expiry !== "number" || typeof raw.rot !== "string") return null;
  const bounties: BountyCycle["bounties"] = {};
  for (const [tag, list] of Object.entries((raw.bounties ?? {}) as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;
    bounties[tag] = list.filter(isEntry).map((e) => ({
      node: e.node,
      challenge: e.challenge,
      ...(e.ally ? { ally: e.ally } : {}),
    }));
  }
  return {
    expiry: raw.expiry,
    rot: raw.rot,
    vaultRot: typeof raw.vaultRot === "string" ? raw.vaultRot : "",
    zarimanFaction: typeof raw.zarimanFaction === "string" ? raw.zarimanFaction : "",
    bounties,
  };
}

// Jobs come off the drop table in the level order the board prints, and the oracle lists the
// rotation in that same order, so the two line up by index.
function withRotation(board: Bounty, entries: BountyCycle["bounties"][string], cycle: BountyCycle): Bounty {
  const jobs: BountyJob[] = board.jobs.map((job, i) => {
    const entry = entries[i];
    if (!entry) return job;
    return {
      ...job,
      missionType: nodeMissionType(entry.node) || job.missionType,
      node: nodeName(entry.node),
      challenge: challengeLabel(entry.challenge),
    };
  });
  return { ...board, jobs, expiresAt: cycle.expiry, rotation: cycle.rot };
}

// Only the fixed boards are filled from the cycle. A live board already carries its own jobs, and
// a fixed board the oracle does not list, like Vox Solaris, keeps the drop table version untouched.
export function withBountyCycle(state: WorldState, cycle: BountyCycle | null): WorldState {
  if (!cycle) return state;
  const byName: Record<string, BountyCycle["bounties"][string]> = {};
  for (const [tag, entries] of Object.entries(cycle.bounties)) {
    const name = BOARDS[tag];
    if (name && entries.length > 0) byName[name] = entries;
  }
  return {
    ...state,
    bountyCycle: cycle,
    bounties: (state.bounties ?? []).map((board) => {
      const entries = board.static ? byName[board.syndicate] : undefined;
      return entries ? withRotation(board, entries, cycle) : board;
    }),
  };
}
