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

const [solNodes, missionTypes, factions, sortie, languages] = await Promise.all(
  ["solNodes", "missionTypes", "factionsData", "sortieData", "languages"].map(load),
);

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
  names,
};

writeFileSync("convex/ingest/de-names.json", JSON.stringify(out));
console.log("nodes", Object.keys(out.nodes).length, "names", Object.keys(out.names).length);
