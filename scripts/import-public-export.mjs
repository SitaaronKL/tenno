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
];

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

function toItem(row) {
  const category = row.productCategory;
  const kind = KINDS[category];
  if (!kind || row.excludeFromCodex) return null;
  const perLevel = WEAPON_CATEGORIES.has(category) ? 100 : PER_LEVEL[kind];
  return {
    uniqueName: row.uniqueName,
    name: cleanName(row.name),
    category,
    kind,
    masteryReq: row.masteryReq ?? 0,
    masteryXp: perLevel * levels(row, category),
    buildable: false,
    components: [],
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

  mkdirSync(OUT, { recursive: true });
  const sorted = [...byUniqueName.values()].sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(join(OUT, "items.json"), `${JSON.stringify(sorted)}\n`);
  writeFileSync(join(OUT, "nodes.json"), `${JSON.stringify(nodes)}\n`);
  console.log(`items ${sorted.length}, nodes ${nodes.length}`);
}

await main();
