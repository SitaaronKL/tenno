import { describe, expect, test } from "vitest";
import { PALLADINO_SOURCE, PALLADINO_WARES, wareLabel } from "./palladino";

describe("Palladino's weekly wares", () => {
  test("the wiki page the list was read from is recorded", () => {
    expect(PALLADINO_SOURCE.url).toContain("wiki.warframe.com");
    expect(PALLADINO_SOURCE.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("every ware she sells weekly is listed, both Rivens included", () => {
    expect(PALLADINO_WARES.map((w) => w.item)).toEqual(
      expect.arrayContaining([
        "Riven Mod",
        "Veiled Riven Cipher",
        "Riven Transmuter",
        "6,000 Endo",
        "150,000 Credits",
        "35,000 Kuva",
        "Requiem I Relic",
      ]),
    );
    expect(PALLADINO_WARES.filter((w) => w.item === "Riven Mod")).toHaveLength(2);
  });

  test("every ware has its own key, so two Rivens tick separately", () => {
    const keys = PALLADINO_WARES.map((w) => w.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("a ware reads as the thing and what it costs", () => {
    expect(wareLabel({ key: "endo", item: "6,000 Endo", slivers: 10 })).toBe(
      "6,000 Endo for 10 Riven Slivers",
    );
    expect(wareLabel({ key: "one", item: "Riven Mod", slivers: 1 })).toBe(
      "Riven Mod for 1 Riven Sliver",
    );
  });
});
