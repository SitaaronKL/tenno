// Regenerates convex/ingest/de-names.json from WFCD warframe-worldstate-data.
// Run it after a game update: node scripts/build-de-names.mjs
import { readFileSync, writeFileSync } from "node:fs";

const BASE = "https://raw.githubusercontent.com/WFCD/warframe-worldstate-data/master/data";

async function load(name) {
  const response = await fetch(`${BASE}/${name}.json`);
  if (!response.ok) throw new Error(`${name}: ${response.status}`);
  return response.json();
}

const values = (table) =>
  Object.fromEntries(Object.entries(table).map(([key, entry]) => [key, entry.value]));

const [solNodes, missionTypes, factions, sortie, languages, syndicates] = await Promise.all(
  ["solNodes", "missionTypes", "factionsData", "sortieData", "languages", "syndicatesData"].map(load),
);

// WFCD lags a game update by weeks, and the newest nodes are exactly the ones the fixed boards run
// on, so DE's own star chart export fills the gaps. Credit for the mirror is in docs/de-endpoints.md.
const PLUS = "https://browse.wf/warframe-public-export-plus";

async function plus(name) {
  const response = await fetch(`${PLUS}/${name}.json`);
  if (!response.ok) throw new Error(`${name}: ${response.status}`);
  return response.json();
}

const [regions, dict] = await Promise.all([plus("ExportRegions"), plus("dict.en")]);
const say = (path) => dict[path] ?? "";

// The node reads "Everview Arc (Zariman)", the same shape WFCD writes.
function regionNode(region) {
  const name = say(region.name);
  const system = say(region.systemName);
  if (!name) return null;
  return {
    value: system ? `${name} (${system})` : name,
    enemy: factions[region.faction]?.value ?? "",
    type: missionTypes[region.missionType]?.value ?? "",
  };
}

// DE names a bounty's reward table by path only. WFCD's drop data is the only place the items
// behind those paths are written down, keyed by the level range and rotation the game shows.
const DROPS = "https://drops.warframestat.us/data";
const DROP_FILES = [
  "cetusBountyRewards",
  "solarisBountyRewards",
  "deimosRewards",
  "zarimanRewards",
  "entratiLabRewards",
  "hexRewards",
];

async function dropRows(name) {
  const response = await fetch(`${DROPS}/${name}.json`);
  if (!response.ok) throw new Error(`${name}: ${response.status}`);
  return Object.values(await response.json())[0];
}

const bountyRewards = {};
for (const file of DROP_FILES) {
  for (const row of await dropRows(file)) {
    // The scrape writes "Level  50 - 55 Zariman Bounty" with a double space on some sections.
    const level = String(row.bountyLevel).replace(/\s+/g, " ").trim().toLowerCase();
    const rotations = Array.isArray(row.rewards) ? { A: row.rewards } : (row.rewards ?? {});
    for (const [rotation, drops] of Object.entries(rotations)) {
      const items = [...new Set(drops.map((d) => d.itemName))];
      if (items.length) bountyRewards[`${level}|${rotation.toLowerCase()}`] = items;
    }
  }
}

// DE spells the same /Lotus path with different casing across feeds, so the key is lowercased.
const names = {};
for (const [path, entry] of Object.entries(languages)) {
  names[path.toLowerCase()] = entry.desc ? { value: entry.value, desc: entry.desc } : entry.value;
}

const out = {
  // Nodes keep enemy and mission type too, Void Storms name neither.
  nodes: {
    ...Object.fromEntries(
      Object.entries(regions).flatMap(([key, r]) => {
        const node = regionNode(r);
        return node ? [[key, node]] : [];
      }),
    ),
    // WFCD wins where it has the node, its names carry the spellings the community uses.
    ...Object.fromEntries(
      Object.entries(solNodes).map(([key, n]) => [key, { value: n.value, enemy: n.enemy ?? "", type: n.type ?? "" }]),
    ),
  },
  missionTypes: values(missionTypes),
  factions: values(factions),
  sortieBosses: Object.fromEntries(
    Object.entries(sortie.bosses).map(([key, boss]) => [key, { name: boss.name, faction: boss.faction }]),
  ),
  sortieModifiers: sortie.modifierTypes,
  syndicates: Object.fromEntries(Object.entries(syndicates).map(([key, s]) => [key, s.name])),
  bountyRewards,
  // Bare ids, the sortie and Archimedea modifiers. Small and hot, so they stay in the bundle.
  modifiers: Object.fromEntries(Object.entries(names).filter(([key]) => !key.startsWith("/"))),
};

// The /Lotus paths are 550 KB of the table and a snapshot resolves a few hundred of them, so they
// go to the deNames table instead of the function bundle. scripts/seed-tables.mjs loads them.
const paths = Object.fromEntries(Object.entries(names).filter(([key]) => key.startsWith("/")));

writeFileSync("convex/ingest/de-names.json", JSON.stringify(out) + "\n");
writeFileSync(
  "convex/gamedata/deNames.json",
  JSON.stringify({ source: "scripts/build-de-names.mjs", paths }) + "\n",
);
// The de.test.ts fixture reads a cut of the same table, so it is rewritten here rather than left
// to drift into naming items by the tail of their path.
const fixture = JSON.parse(readFileSync("convex/ingest/__fixtures__/de.json", "utf8"));
const wanted = new Set();
const walk = (value) => {
  if (typeof value === "string") {
    const path = value.toLowerCase();
    if (path.startsWith("/lotus/")) wanted.add(path);
    return;
  }
  if (Array.isArray(value)) return value.forEach(walk);
  if (value && typeof value === "object") Object.values(value).forEach(walk);
};
walk(fixture);
const fixturePaths = Object.fromEntries(
  [...wanted].sort().flatMap((path) => (path in paths ? [[path, paths[path]]] : [])),
);
writeFileSync(
  "convex/ingest/__fixtures__/de-names.json",
  JSON.stringify({
    source: "convex/gamedata/deNames.json, trimmed to the paths __fixtures__/de.json names",
    paths: fixturePaths,
  }) + "\n",
);

console.log(
  "nodes", Object.keys(out.nodes).length,
  "modifiers", Object.keys(out.modifiers).length,
  "paths", Object.keys(paths).length,
  "bountyRewards", Object.keys(out.bountyRewards).length,
);
