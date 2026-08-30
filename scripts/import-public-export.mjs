// Downloads DE's Public Export and trims it to the mastery fields we need.
// Usage: node scripts/import-public-export.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import lzma from "lzma-purejs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "convex", "gamedata");
const BASE = "https://content.warframe.com/PublicExport";

// Manifests we read. Everything else in the index is out of scope for mastery.
const WANTED = [
  "ExportWarframes",
  "ExportWeapons",
  "ExportSentinels",
  "ExportRecipes",
  "ExportRegions",
  "ExportUpgrades",
  "ExportRelicArcane",
];

// DE's polarity ids, named the way the game names them, so the UI can print a symbol.
const POLARITIES = {
  AP_ATTACK: "madurai",
  AP_DEFENSE: "vazarin",
  AP_TACTIC: "naramon",
  AP_POWER: "zenurik",
  AP_WARD: "unairu",
  AP_PRECEPT: "penjaga",
  AP_UMBRA: "umbra",
  AP_UNIVERSAL: "universal",
  AP_ANY: "any",
};

// The stat lines the build preview understands. Everything else is kept as text only.
const STATS = {
  Health: "health",
  "Shield Capacity": "shield",
  Shield: "shield",
  Armor: "armor",
  "Energy Max": "energy",
  "Sprint Speed": "sprint",
  "Ability Duration": "duration",
  "Ability Efficiency": "efficiency",
  "Ability Range": "range",
  "Ability Strength": "strength",
};

// productCategory to our kind. Anything missing is dropped, it gives no mastery.
const KINDS = {
  Suits: "warframe",
  SpaceSuits: "archwing",
  MechSuits: "other",
  LongGuns: "primary",
  Pistols: "secondary",
  Melee: "melee",
  SpaceGuns: "archwing",
  SpaceMelee: "archwing",
  SentinelWeapons: "companion",
  Sentinels: "companion",
  KubrowPets: "companion",
};

// Frames and companions earn 200 mastery a level, weapons earn 100.
const PER_LEVEL = { warframe: 200, archwing: 200, companion: 200, other: 200 };
const WEAPON_CATEGORIES = new Set([
  "LongGuns",
  "Pistols",
  "Melee",
  "SpaceGuns",
  "SpaceMelee",
  "SentinelWeapons",
]);

async function get(path) {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res;
}

async function index() {
  const res = await get("index_en.txt.lzma");
  const bytes = new Uint8Array(await res.arrayBuffer());
  const text = Buffer.from(lzma.decompressFile(bytes)).toString("utf8");
  // The index is CRLF, a stray carriage return makes the manifest URL 404.
  return text.split(/\r?\n/).filter(Boolean);
}

async function manifest(line) {
  const res = await get(`Manifest/${line}`);
  const raw = await res.text();
  // Recipes, Warframes and Weapons carry raw newlines inside description strings.
  return JSON.parse(raw.replace(/\r/g, "").replace(/\n/g, "\\n"));
}

function cleanName(name) {
  return name.replace(/^<ARCHWING>\s*/, "").trim();
}

function levels(row, category) {
  if (row.maxLevelCap) return row.maxLevelCap;
  return category === "MechSuits" ? 40 : 30;
}

// Base stats, frames only. The build preview starts from these, weapons carry no comparable set.
function toStats(row) {
  if (row.productCategory !== "Suits") return undefined;
  return {
    health: row.health ?? 0,
    shield: row.shield ?? 0,
    armor: row.armor ?? 0,
    energy: row.power ?? 0,
    // DE stores sprint as a float with a long tail, two decimals is what the game shows.
    sprint: Math.round((row.sprintSpeed ?? 1) * 100) / 100,
  };
}

function toItem(row) {
  const category = row.productCategory;
  const kind = KINDS[category];
  if (!kind || row.excludeFromCodex) return null;
  const perLevel = WEAPON_CATEGORIES.has(category) ? 100 : PER_LEVEL[kind];
  const stats = toStats(row);
  return {
    uniqueName: row.uniqueName,
    name: cleanName(row.name),
    category,
    kind,
    masteryReq: row.masteryReq ?? 0,
    masteryXp: perLevel * levels(row, category),
    buildable: false,
    components: [],
    ...(stats ? { stats } : {}),
  };
}

// A mod's text at max rank is one line per stat, joined. Ranks below max scale linearly.
function maxRankStats(row) {
  const last = row.levelStats?.at(-1)?.stats ?? [];
  const lines = last.map((l) => l.replace(/\r/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
  // Arcanes repeat a rider inside the long line and again on its own, keep it once.
  return lines.filter((line, i) => !lines.some((other, j) => j !== i && other.includes(line) && other.length > line.length));
}

// "+45% Ability Range" becomes { stat: "range", percent: 45 }. Unparsed lines stay text only.
function toEffects(lines) {
  const effects = [];
  for (const line of lines) {
    const match = /^([+-]?\d+(?:\.\d+)?)% ([A-Za-z ]+)$/.exec(line);
    if (!match) continue;
    const stat = STATS[match[2].trim()];
    if (!stat) continue;
    effects.push({ stat, percent: Number(match[1]) });
  }
  return effects;
}

function toMod(row) {
  if (row.excludeFromCodex) return null;
  const lines = maxRankStats(row);
  const description = [...(row.description ?? []), ...lines].join(" ").trim();
  return {
    uniqueName: row.uniqueName,
    name: row.name,
    kind: "mod",
    polarity: POLARITIES[row.polarity] ?? "any",
    rarity: (row.rarity ?? "COMMON").toLowerCase(),
    // compatName is the tighter of the two, "Whips" where type only says MELEE.
    type: row.compatName ?? row.type ?? "---",
    slot: row.type === "AURA" ? "aura" : row.isUtility === true ? "exilus" : "mod",
    baseDrain: row.baseDrain,
    fusionLimit: row.fusionLimit,
    description,
    effects: toEffects(lines),
  };
}

// Arcanes live in ExportRelicArcane next to the relics, only the arcanes carry levelStats.
function toArcane(row) {
  if (row.excludeFromCodex || !row.levelStats) return null;
  const lines = maxRankStats(row);
  return {
    uniqueName: row.uniqueName,
    name: row.name,
    kind: "arcane",
    polarity: "any",
    rarity: (row.rarity ?? "COMMON").toLowerCase(),
    type: "ARCANE",
    slot: "arcane",
    baseDrain: 0,
    fusionLimit: row.levelStats.length - 1,
    description: lines.join(" ").trim(),
    effects: toEffects(lines),
  };
}

async function main() {
  const lines = await index();
  const files = {};
  for (const want of WANTED) {
    const line = lines.find((l) => l.startsWith(`${want}_en.json!`));
    if (!line) throw new Error(`${want} missing from the index`);
    files[want] = await manifest(line);
  }

  const rows = [
    ...files.ExportWarframes.ExportWarframes,
    ...files.ExportWeapons.ExportWeapons,
    ...files.ExportSentinels.ExportSentinels,
  ];
  const items = rows.map(toItem).filter(Boolean);
  const byUniqueName = new Map(items.map((item) => [item.uniqueName, item]));

  for (const recipe of files.ExportRecipes.ExportRecipes) {
    const item = byUniqueName.get(recipe.resultType);
    // Some blueprints hide their ingredients, so keep looking for one that lists them.
    if (!item || item.components.length > 0) continue;
    item.buildable = true;
    item.components = (recipe.ingredients ?? []).map((ingredient) => ({
      itemType: ingredient.ItemType,
      count: ingredient.ItemCount,
    }));
  }

  const nodes = files.ExportRegions.ExportRegions.map((row) => ({
    uniqueName: row.uniqueName,
    name: row.name,
    planet: row.systemName,
    masteryReq: row.masteryReq ?? 0,
  }));

  const mods = [
    ...files.ExportUpgrades.ExportUpgrades.map(toMod),
    ...files.ExportRelicArcane.ExportRelicArcane.map(toArcane),
  ]
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  mkdirSync(OUT, { recursive: true });
  const sorted = [...byUniqueName.values()].sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(join(OUT, "items.json"), `${JSON.stringify(sorted)}\n`);
  writeFileSync(join(OUT, "nodes.json"), `${JSON.stringify(nodes)}\n`);
  writeFileSync(join(OUT, "mods.json"), `${JSON.stringify(mods)}\n`);
  const covered = mods.filter((mod) => mod.effects.length > 0).length;
  console.log(`items ${sorted.length}, nodes ${nodes.length}, mods ${mods.length}, with stat effects ${covered}`);
}

await main();
