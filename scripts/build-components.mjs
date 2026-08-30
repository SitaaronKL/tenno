// Writes convex/gamedata/components.json, the name and recipe of every part a built item asks for.
// Usage: node scripts/build-components.mjs
//
// items.json carries components as bare uniqueNames with counts, and nothing else names them, so a
// goal made from a recipe would read "/Lotus/Types/Items/MiscItems/Neurode". ExportResources names
// them, ExportRecipes gives a part its own ingredients, which is the second level the tracker needs.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import lzma from "lzma-purejs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "convex", "gamedata");
const BASE = "https://content.warframe.com/PublicExport";
const WANTED = ["ExportResources", "ExportRecipes", "ExportKeys", "ExportGear"];

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
  const raw = await (await get(`Manifest/${line}`)).text();
  // Recipes and resources carry raw newlines inside description strings.
  return JSON.parse(raw.replace(/\r/g, "").replace(/\n/g, "\\n"));
}

const lines = await index();
const files = {};
for (const want of WANTED) {
  const line = lines.find((l) => l.startsWith(`${want}_en.json!`));
  if (!line) throw new Error(`${want} missing from the index`);
  files[want] = await manifest(line);
}

const names = new Map();
for (const key of WANTED) {
  for (const rows of Object.values(files[key])) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (row?.uniqueName && row?.name) names.set(row.uniqueName, String(row.name).trim());
    }
  }
}

const recipes = new Map();
for (const recipe of files.ExportRecipes.ExportRecipes) {
  // Some blueprints hide their ingredients, so keep the first one that lists them.
  if (!recipe.resultType || recipes.has(recipe.resultType)) continue;
  const ingredients = (recipe.ingredients ?? []).map((i) => ({
    itemType: i.ItemType,
    count: i.ItemCount,
  }));
  if (ingredients.length > 0) recipes.set(recipe.resultType, ingredients);
}

const items = JSON.parse(readFileSync(join(OUT, "items.json"), "utf8"));
for (const item of items) names.set(item.uniqueName, item.name);

// A part is a blueprint result or a whole weapon. Raw resources also carry a recipe, the Helminth
// converter, and exploding Neurodes into 50,000 Alloy Plate is not what a farmer asked for.
const isPart = (uniqueName) =>
  uniqueName.startsWith("/Lotus/Types/Recipes/") || uniqueName.startsWith("/Lotus/Weapons/");

// Two levels below a built item is all the tracker explodes, so that is all we keep.
const out = new Map();
function visit(uniqueName, depth) {
  if (out.has(uniqueName) || depth > 2) return;
  const components = isPart(uniqueName) ? (recipes.get(uniqueName) ?? []) : [];
  out.set(uniqueName, { uniqueName, name: names.get(uniqueName) ?? uniqueName, components });
  for (const component of components) visit(component.itemType, depth + 1);
}
for (const item of items) {
  for (const component of item.components) visit(component.itemType, 1);
}

const rows = [...out.values()].sort((a, b) => a.uniqueName.localeCompare(b.uniqueName));
const unnamed = rows.filter((row) => row.name === row.uniqueName).length;
const path = join(OUT, "components.json");
writeFileSync(path, `${JSON.stringify(rows)}\n`);
console.log(
  `components.json ${rows.length} parts, ${Math.round(JSON.stringify(rows).length / 1024)} KB, ${unnamed} unnamed`,
);
