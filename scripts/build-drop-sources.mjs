// Writes convex/gamedata/dropSources.json, where every item we know about drops from.
// Usage: node scripts/build-drop-sources.mjs
//
// DE's drop table page is 4.4 MB of HTML, WFCD scrapes it into all.json, and all.json is 6.6 MB.
// The tracker only ever asks "where do I farm this", so we keep the best few places per item and
// only for items our own data names. The cut is recorded in the file and printed on every run.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "convex", "gamedata");
const ALL = "https://drops.warframestat.us/data/all.json";
const INFO = "https://drops.warframestat.us/data/info.json";

const PER_ITEM = 8;
const MAX_BYTES = 800 * 1024;

// Bounty boards, one drop table section each, keyed by rotation.
const BOARDS = [
  "cetusBountyRewards",
  "solarisBountyRewards",
  "deimosRewards",
  "zarimanRewards",
  "entratiLabRewards",
  "hexRewards",
];

// Enemy tables that are keyed by the source rather than by the item.
const BY_SOURCE = ["resourceByAvatar", "sigilByAvatar", "additionalItemByAvatar"];

async function load(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

// The tables print counts and blueprints in the name, our data names the thing itself.
function candidates(itemName) {
  const text = String(itemName).replace(/\s+/g, " ").trim();
  const bare = text.replace(/^\d[\d,]*\s*[xX]\s*/, "");
  return [text, bare, bare.replace(/ Blueprint$/i, "")];
}

function tidy(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

const [all, info] = await Promise.all([load(ALL), load(INFO)]);

// Our own names, the only items worth an entry. mods.json lands with the builds slice, so it is
// read when it is there and skipped when it is not.
const known = new Map();
function learn(rows, field = "name") {
  for (const row of rows) known.set(row[field].toLowerCase(), row[field]);
}
learn(JSON.parse(readFileSync(join(OUT, "items.json"), "utf8")));
learn(JSON.parse(readFileSync(join(OUT, "components.json"), "utf8")));
let mods = 0;
try {
  const rows = JSON.parse(readFileSync(join(OUT, "mods.json"), "utf8"));
  learn(rows);
  mods = rows.length;
} catch {
  mods = 0;
}

const sources = new Map();
let seen = 0;
function add(itemName, place, rotation, chance) {
  seen += 1;
  const name = candidates(itemName)
    .map((candidate) => known.get(candidate.toLowerCase()))
    .find(Boolean);
  if (!name) return;
  const value = Number(chance);
  if (!Number.isFinite(value) || value <= 0) return;
  const list = sources.get(name) ?? [];
  const row = { place: tidy(place), rotation: tidy(rotation), chance: Math.round(value * 100) / 100 };
  // The scrape repeats an item once per stage, so one place keeps its best chance.
  const same = list.find((entry) => entry.place === row.place && entry.rotation === row.rotation);
  if (same) same.chance = Math.max(same.chance, row.chance);
  else list.push(row);
  sources.set(name, list);
}

// A pool is either a flat list or an object of rotations.
function addPool(pool, place) {
  if (Array.isArray(pool)) {
    for (const drop of pool) add(drop.itemName ?? drop.item, place, drop.rotation ?? "", drop.chance);
    return;
  }
  for (const [rotation, drops] of Object.entries(pool ?? {})) {
    for (const drop of drops ?? []) add(drop.itemName ?? drop.item, place, rotation, drop.chance);
  }
}

for (const [planet, nodes] of Object.entries(all.missionRewards ?? {})) {
  for (const [node, mission] of Object.entries(nodes)) {
    addPool(mission.rewards, `${node} (${planet}), ${mission.gameMode ?? "Mission"}`);
  }
}

// Intact only: the four refinements repeat the same pool at different odds.
for (const relic of all.relics ?? []) {
  if (relic.state !== "Intact") continue;
  addPool(relic.rewards, `${relic.tier} ${relic.relicName} relic`);
}

for (const section of BOARDS) {
  for (const board of all[section] ?? []) addPool(board.rewards, tidy(board.bountyLevel));
}

for (const objective of all.transientRewards ?? []) addPool(objective.rewards, objective.objectiveName);
for (const key of all.keyRewards ?? []) addPool(key.rewards, `${key.keyName}, key`);
addPool(all.sortieRewards ?? [], "Sortie");

for (const mod of all.modLocations ?? []) {
  for (const enemy of mod.enemies ?? []) add(mod.modName, enemy.enemyName, "", enemy.chance);
}
for (const blueprint of all.blueprintLocations ?? []) {
  for (const enemy of blueprint.enemies ?? []) add(blueprint.itemName, enemy.enemyName, "", enemy.chance);
}
for (const section of BY_SOURCE) {
  for (const row of all[section] ?? []) {
    for (const drop of row.items ?? []) add(drop.item, row.source, "", drop.chance);
  }
}
for (const [syndicate, offerings] of Object.entries(all.syndicates ?? {})) {
  for (const offering of offerings ?? []) add(offering.item, offering.place ?? syndicate, "", offering.chance);
}

let dropped = 0;
const items = {};
for (const [name, list] of [...sources].sort(([a], [b]) => a.localeCompare(b))) {
  list.sort((a, b) => b.chance - a.chance);
  // One place first, then its other rotations, so the top of the list is eight places and not one
  // bounty band printed eight times.
  const places = new Set();
  const best = list.filter((row) => !places.has(row.place) && places.add(row.place));
  const trimmed = [...best, ...list.filter((row) => !best.includes(row))].slice(0, PER_ITEM);
  dropped += list.length - trimmed.length;
  items[name] = trimmed;
}

const kept = Object.values(items).reduce((n, list) => n + list.length, 0);
const out = {
  source: ALL,
  hash: info.hash,
  // When DE last regenerated the drop table page, in ms.
  modified: info.modified,
  modifiedIso: new Date(info.modified).toISOString(),
  // What the trim threw away, so a reader knows this file is not the whole drop table.
  cut: { perItem: PER_ITEM, itemsKnown: known.size, rowsRead: seen, kept, droppedBeyondPerItem: dropped },
  items,
};

const text = `${JSON.stringify(out)}\n`;
if (text.length > MAX_BYTES) throw new Error(`dropSources.json is ${text.length} bytes, over ${MAX_BYTES}`);
writeFileSync(join(OUT, "dropSources.json"), text);
console.log(
  `dropSources.json ${Object.keys(items).length} items, ${kept} sources, ${Math.round(text.length / 1024)} KB,`,
  `modified ${out.modifiedIso}, mods.json ${mods === 0 ? "absent" : `${mods} rows`}`,
);
