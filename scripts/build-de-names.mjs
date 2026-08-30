// Regenerates convex/ingest/de-names.json from WFCD warframe-worldstate-data.
// Run it after a game update: node scripts/build-de-names.mjs
import { writeFileSync } from "node:fs";

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
  nodes: Object.fromEntries(
    Object.entries(solNodes).map(([key, n]) => [key, { value: n.value, enemy: n.enemy ?? "", type: n.type ?? "" }]),
  ),
  missionTypes: values(missionTypes),
  factions: values(factions),
  sortieBosses: Object.fromEntries(
    Object.entries(sortie.bosses).map(([key, boss]) => [key, { name: boss.name, faction: boss.faction }]),
  ),
  sortieModifiers: sortie.modifierTypes,
  syndicates: Object.fromEntries(Object.entries(syndicates).map(([key, s]) => [key, s.name])),
  bountyRewards,
  names,
};

writeFileSync("convex/ingest/de-names.json", JSON.stringify(out));
console.log(
  "nodes", Object.keys(out.nodes).length,
  "names", Object.keys(out.names).length,
  "bountyRewards", Object.keys(out.bountyRewards).length,
);
