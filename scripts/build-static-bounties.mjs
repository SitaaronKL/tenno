// Regenerates convex/ingest/static-bounties.json from the WFCD drop table mirror.
// Run it after a game update: node scripts/build-static-bounties.mjs
//
// DE's world state lists the Zariman, Entrati Lab, Vox Solaris and Höllvania boards with zero jobs,
// so the only place their bounties are written down is DE's own drop table page, which WFCD scrapes.
import { writeFileSync } from "node:fs";

const ALL = "https://drops.warframestat.us/data/all.json";
const INFO = "https://drops.warframestat.us/data/info.json";

// Each board is one drop table section, narrowed to the rows that belong to the syndicate.
const BOARDS = [
  { syndicate: "The Holdfasts", node: "Chrysalith (Zariman)", section: "zarimanRewards", rows: /Zariman Bounty$/i },
  { syndicate: "Cavia", node: "Sanctum Anatomica (Deimos)", section: "entratiLabRewards", rows: /Entrati Lab Bounty$/i },
  { syndicate: "Vox Solaris", node: "Fortuna (Venus)", section: "solarisBountyRewards", rows: /PROFIT-TAKER/i },
  { syndicate: "The Hex", node: "Höllvania Central Mall (Höllvania)", section: "hexRewards", rows: /WF1999 Bounty$/i },
];

const ROTATIONS = ["A", "B", "C"];

async function load(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

// "Level  50 - 55 Zariman Bounty" with a double space on some sections, the rest is the job name.
function parseLevel(bountyLevel) {
  const text = String(bountyLevel).replace(/\s+/g, " ").trim();
  const match = text.match(/^Level (\d+) - (\d+) (.*)$/i);
  if (!match) throw new Error(`unreadable bounty level: ${text}`);
  return { minLevel: Number(match[1]), maxLevel: Number(match[2]), name: match[3] };
}

// "PROFIT-TAKER - PHASE 1" is shouted and hyphenated, the board prints it as words.
function title(name) {
  return name
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

const [all, info] = await Promise.all([load(ALL), load(INFO)]);

const boards = BOARDS.map((board) => {
  const section = all[board.section];
  if (!Array.isArray(section)) throw new Error(`${board.section} is not a list, the mirror changed shape`);
  const rows = section.filter((row) => board.rows.test(String(row.bountyLevel).replace(/\s+/g, " ").trim()));
  if (rows.length === 0) throw new Error(`${board.section}: no rows matched ${board.rows}`);

  const jobs = rows.map((row) => {
    const { minLevel, maxLevel, name } = parseLevel(row.bountyLevel);
    const pools = Array.isArray(row.rewards) ? { A: row.rewards } : (row.rewards ?? {});
    const rewardTable = [];
    for (const rotation of ROTATIONS) {
      const drops = pools[rotation] ?? [];
      if (drops.length === 0) continue;
      // One line per item, the scrape repeats an item once per stage it can drop from.
      const byItem = new Map();
      for (const drop of drops) {
        const chance = Number(drop.chance) || 0;
        const seen = byItem.get(drop.itemName) ?? 0;
        if (chance > seen) byItem.set(drop.itemName, chance);
      }
      rewardTable.push({
        rotation,
        rewards: [...byItem].map(([item, chance]) => ({ item, chance: Math.round(chance * 100) / 100 })),
      });
    }
    return { level: `${minLevel} - ${maxLevel}`, minLevel, maxLevel, name, rewardTable };
  });

  // Profit Taker runs four phases at the same level, so those jobs need their name to tell them apart.
  const bands = new Set(jobs.map((j) => j.level));
  return {
    syndicate: board.syndicate,
    node: board.node,
    jobs: jobs.map(({ name, ...job }) => (bands.size === jobs.length ? job : { ...job, title: title(name) })),
  };
});

const out = {
  source: ALL,
  hash: info.hash,
  // When DE last regenerated the drop table page, in ms.
  modified: info.modified,
  modifiedIso: new Date(info.modified).toISOString(),
  boards,
};

const path = "convex/ingest/static-bounties.json";
writeFileSync(path, JSON.stringify(out));
console.log(
  path,
  Math.round(JSON.stringify(out).length / 1024) + " KB",
  "modified", out.modifiedIso,
);
for (const board of boards) {
  console.log(" ", board.syndicate, board.jobs.length, "jobs,",
    board.jobs.reduce((n, j) => n + j.rewardTable.reduce((m, r) => m + r.rewards.length, 0), 0), "rewards");
}
