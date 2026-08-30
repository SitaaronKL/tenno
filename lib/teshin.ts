// Teshin's Steel Path Honors rotating offer. Eight items, one week each, no API behind it.
// Order and cycle verified against wiki.warframe.com/w/The_Steel_Path (Weekly Rotating Offer),
// whose epoch is 2020-11-16 and lands on the same index as the 2025-01-06 epoch used here.
export const TESHIN_ITEMS = [
  "Umbra Forma Blueprint",
  "50,000 Kuva",
  "Kitgun Riven Mod",
  "3 x Forma",
  "Zaw Riven Mod",
  "30,000 Endo",
  "Rifle Riven Mod",
  "Shotgun Riven Mod",
];

const WEEK_MS = 604_800_000;

// Monday 2025-01-06 00:00 UTC, the week the cycle is indexed from.
const EPOCH = Date.UTC(2025, 0, 6);

export function teshinOffering(now: number): { item: string; expiresAt: number } {
  const weeks = Math.floor((now - EPOCH) / WEEK_MS);
  const index = ((weeks % TESHIN_ITEMS.length) + TESHIN_ITEMS.length) % TESHIN_ITEMS.length;
  return { item: TESHIN_ITEMS[index], expiresAt: EPOCH + (weeks + 1) * WEEK_MS };
}
