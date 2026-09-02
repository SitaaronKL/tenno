// The one list of things a user can hide. The settings switches draw it, the world state page reads
// it, and convex/profiles.ts validates against it, so both sides agree on every key.

export type HiddenKey = { key: string; label: string };
export type HiddenGroup = { title: string; keys: HiddenKey[] };

// Keys carry their group, so a board and a tile for the same place never collide.
export const HIDDEN_GROUPS: HiddenGroup[] = [
  {
    title: "Boxes",
    keys: [
      { key: "box.fissures", label: "Fissures" },
      { key: "box.bounties", label: "Bounties" },
      { key: "box.events", label: "Invasions and Alerts" },
      { key: "box.missions", label: "Sortie and Archon Hunt" },
      { key: "box.archimedea", label: "Archimedea" },
      { key: "box.nightwave", label: "Nightwave" },
      { key: "box.baro", label: "Baro" },
      // The extras slice draws these two, the switches are here so its boxes arrive hideable.
      { key: "box.incursions", label: "Incursions" },
      { key: "box.weekly", label: "Weekly" },
    ],
  },
  {
    title: "Bounty boards",
    keys: [
      { key: "board.cetus", label: "Cetus" },
      { key: "board.fortuna", label: "Fortuna" },
      { key: "board.deimos", label: "Deimos" },
      { key: "board.zariman", label: "Zariman" },
      { key: "board.cavia", label: "Cavia" },
      { key: "board.vox", label: "Vox" },
      { key: "board.hex", label: "Hex" },
    ],
  },
  {
    title: "Tiles",
    keys: [
      { key: "tile.cetus", label: "Cetus" },
      { key: "tile.vallis", label: "Orb Vallis" },
      { key: "tile.cambion", label: "Cambion Drift" },
      { key: "tile.earth", label: "Earth" },
      { key: "tile.duviri", label: "Duviri" },
      { key: "tile.zariman", label: "Zariman" },
      { key: "tile.baro", label: "Baro" },
      { key: "tile.daily", label: "Daily reset" },
      { key: "tile.weekly", label: "Weekly reset" },
      // Drawn by the extras slice, hideable from the day it lands.
      { key: "tile.arbitration", label: "Arbitration" },
    ],
  },
];

export const HIDDEN_KEYS: string[] = HIDDEN_GROUPS.flatMap((group) =>
  group.keys.map((entry) => entry.key),
);

// Fissure defaults ride the same saved array. At most one path key, absence means All,
// and absence of the tier key means the highest tier sits on top.
export const FISSURE_PATH_PREFS = [
  { key: "pref.fissures.normal", value: "normal", label: "Normal" },
  { key: "pref.fissures.steel", value: "steel", label: "Steel Path" },
  { key: "pref.fissures.storm", value: "storm", label: "Void Storm" },
] as const;
export const FISSURE_LITH_FIRST = "pref.fissures.lithFirst";

const KNOWN = new Set([
  ...HIDDEN_KEYS,
  ...FISSURE_PATH_PREFS.map((entry) => entry.key),
  FISSURE_LITH_FIRST,
]);

export function isHiddenKey(key: string): boolean {
  return KNOWN.has(key);
}

// Upstream names the syndicate, the switch names the place, so the board reads through this.
const BOARDS: Record<string, string> = {
  Ostron: "board.cetus",
  Ostrons: "board.cetus",
  "Solaris United": "board.fortuna",
  Entrati: "board.deimos",
  "The Holdfasts": "board.zariman",
  Cavia: "board.cavia",
  "Vox Solaris": "board.vox",
  "The Hex": "board.hex",
};

// A syndicate we do not know cannot be hidden, it is still worth showing.
export function boardKey(syndicate: string): string | null {
  return BOARDS[syndicate] ?? null;
}
