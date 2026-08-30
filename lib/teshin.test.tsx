import { describe, expect, it } from "vitest";

import { teshinOffering } from "./teshin";

describe("Teshin's Steel Path Honors", () => {
  it("starts the cycle on Umbra Forma at the epoch week", () => {
    expect(teshinOffering(Date.UTC(2025, 0, 6)).item).toBe("Umbra Forma Blueprint");
    expect(teshinOffering(Date.UTC(2025, 0, 12, 23)).item).toBe("Umbra Forma Blueprint");
  });

  it("walks the eight items in the order the wiki prints them", () => {
    const week = (n: number) => teshinOffering(Date.UTC(2025, 0, 6) + n * 604_800_000).item;
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(week)).toEqual([
      "Umbra Forma Blueprint",
      "50,000 Kuva",
      "Kitgun Riven Mod",
      "3 x Forma",
      "Zaw Riven Mod",
      "30,000 Endo",
      "Rifle Riven Mod",
      "Shotgun Riven Mod",
    ]);
    expect(week(8)).toBe("Umbra Forma Blueprint");
  });

  it("expires at the next weekly reset, Monday 00:00 UTC", () => {
    expect(teshinOffering(Date.UTC(2026, 7, 30, 7)).expiresAt).toBe(Date.UTC(2026, 7, 31));
  });

  it("agrees with the wiki's own epoch of 2020-11-16", () => {
    const wikiWeeks = (Date.UTC(2025, 0, 6) - Date.UTC(2020, 10, 16)) / 604_800_000;
    expect(wikiWeeks % 8).toBe(0);
  });
});
