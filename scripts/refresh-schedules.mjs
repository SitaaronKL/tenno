// Regenerates the Steel Path Incursion and Arbitration schedules from browse.wf.
// Run it every few weeks, the arbitration window is short: node scripts/refresh-schedules.mjs
//
// Neither rotation is in DE's world state. browse.wf publishes precomputed schedule files, and
// their About page says the raw data is free to use with credit, which docs/de-endpoints.md gives.
import { writeFileSync } from "node:fs";

const INCURSIONS = "https://browse.wf/sp-incursions.txt";
const ARBITRATIONS = "https://browse.wf/arbys.txt";
const TIERS = "https://browse.wf/supplemental-data/arbyTiers.js";

const DAY = 86_400;
const HOUR = 3_600;

// The whole incursion file is only 100 KB, but past days are dead weight, and a month of hourly
// arbitrations is 10 KB against the 940 KB the full file weighs.
const INCURSION_DAYS = 800;
const ARBITRATION_DAYS = 31;

async function text(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.text();
}

function rows(body, separator) {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf(separator);
      return [Number(line.slice(0, at)), line.slice(at + 1)];
    });
}

// The files are one contiguous run of timestamps, so the trimmed window is a start plus a list.
function window(parsed, step, from, count, url) {
  const start = parsed.findIndex(([at]) => at >= from);
  if (start < 0) throw new Error(`${url} ends before ${new Date(from * 1000).toISOString()}`);
  const kept = parsed.slice(start, start + count);
  kept.forEach(([at], i) => {
    if (at !== kept[0][0] + i * step) throw new Error(`${url} has a gap at ${at}`);
  });
  return { from: kept[0][0], values: kept.map(([, value]) => value) };
}

const now = Math.floor(Date.now() / 1000);
// Both windows open a day back, so a world state snapshot from a few hours ago still resolves.
const yesterday = Math.floor(now / DAY) * DAY - DAY;

const incursions = window(
  rows(await text(INCURSIONS), ";"),
  DAY,
  yesterday,
  INCURSION_DAYS,
  INCURSIONS,
);
writeFileSync(
  "convex/ingest/spIncursions.json",
  JSON.stringify({
    source: INCURSIONS,
    fetchedAt: Date.now(),
    format: "from is the epoch second of days[0], each entry is the next UTC day, six SolNode ids",
    from: incursions.from,
    days: incursions.values.map((line) => line.split(",")),
  }) + "\n",
);

const arbitrations = window(
  rows(await text(ARBITRATIONS), ","),
  HOUR,
  yesterday,
  (ARBITRATION_DAYS * DAY) / HOUR,
  ARBITRATIONS,
);
writeFileSync(
  "convex/ingest/arbitrations.json",
  JSON.stringify({
    source: ARBITRATIONS,
    fetchedAt: Date.now(),
    format: "from is the epoch second of hours[0], each entry is the next hour, one SolNode id",
    from: arbitrations.from,
    hours: arbitrations.values,
  }) + "\n",
);

// window.arbyTiers = { SolNode450: "S", ... }, one letter, S is the top tier and F the bottom.
const tiersBody = await text(TIERS);
const tiers = {};
for (const [, node, tier] of tiersBody.matchAll(/^\s*(\w+):\s*"([SA-F])",?\s*$/gm)) {
  tiers[node] = tier;
}
if (Object.keys(tiers).length === 0) throw new Error(`${TIERS} parsed to nothing`);
writeFileSync(
  "convex/ingest/arbyTiers.json",
  JSON.stringify({
    source: TIERS,
    credit: "Arbitration Goons, via browse.wf",
    fetchedAt: Date.now(),
    tiers,
  }) + "\n",
);

console.log(
  `incursions ${incursions.values.length} days from ${incursions.from}, ` +
    `arbitrations ${arbitrations.values.length} hours from ${arbitrations.from}, ` +
    `tiers ${Object.keys(tiers).length} nodes`,
);
