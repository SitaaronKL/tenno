import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function setup() {
  return convexTest(schema, modules);
}

async function account(t: ReturnType<typeof setup>) {
  return await t.run(async (ctx) => await ctx.db.insert("users", { email: "tenno@example.com" }));
}

// The parts a recipe names come from the parts table now, not from a bundled file.
const ASH_PARTS = [
  {
    uniqueName: "/Lotus/Types/Recipes/WarframeRecipes/AshHelmetComponent",
    name: "Ash Neuroptics",
    components: [{ itemType: "/Lotus/Types/Items/MiscItems/Rubedo", count: 300 }],
  },
  {
    uniqueName: "/Lotus/Types/Recipes/WarframeRecipes/AshChassisComponent",
    name: "Ash Chassis",
    components: [{ itemType: "/Lotus/Types/Items/MiscItems/Rubedo", count: 300 }],
  },
  {
    uniqueName: "/Lotus/Types/Recipes/WarframeRecipes/AshSystemsComponent",
    name: "Ash Systems",
    components: [{ itemType: "/Lotus/Types/Items/MiscItems/Rubedo", count: 300 }],
  },
  {
    uniqueName: "/Lotus/Types/Items/MiscItems/Rubedo",
    name: "Rubedo",
    components: [],
  },
  {
    uniqueName: "/Lotus/Types/Items/MiscItems/OrokinCell",
    name: "Orokin Cell",
    components: [],
  },
];

// Ash, three parts and an Orokin Cell, the shape every warframe recipe has.
async function seedAsh(t: ReturnType<typeof setup>) {
  await t.run(async (ctx) => {
    for (const part of ASH_PARTS) await ctx.db.insert("parts", part);
    await ctx.db.insert("items", {
      uniqueName: "/Lotus/Powersuits/Ninja/Ninja",
      name: "Ash",
      category: "Suits",
      kind: "warframe" as const,
      masteryReq: 0,
      masteryXp: 6000,
      buildable: true,
      components: [
        { itemType: "/Lotus/Types/Recipes/WarframeRecipes/AshHelmetComponent", count: 1 },
        { itemType: "/Lotus/Types/Recipes/WarframeRecipes/AshChassisComponent", count: 1 },
        { itemType: "/Lotus/Types/Recipes/WarframeRecipes/AshSystemsComponent", count: 1 },
        { itemType: "/Lotus/Types/Items/MiscItems/OrokinCell", count: 1 },
      ],
    });
  });
}

describe("goals", () => {
  test("a frame with three parts explodes into its parts and their resources", async () => {
    const t = setup();
    const as = t.withIdentity({ subject: await account(t) });
    await seedAsh(t);

    await as.mutation(api.goals.addFromItem, { uniqueName: "/Lotus/Powersuits/Ninja/Ninja" });
    const goals = await as.query(api.goals.list, {});
    const names = goals.map((goal) => goal.itemName);

    expect(names).toContain("Ash Neuroptics");
    expect(names).toContain("Ash Chassis");
    expect(names).toContain("Ash Systems");
    // Every part is built from Rubedo, so the three lines land on one goal.
    const rubedo = goals.find((goal) => goal.itemName === "Rubedo");
    expect(rubedo?.wantedCount).toBeGreaterThan(500);
    expect(goals.every((goal) => goal.haveCount === 0)).toBe(true);
  });

  test("exploding the same recipe twice merges the counts instead of doubling the rows", async () => {
    const t = setup();
    const as = t.withIdentity({ subject: await account(t) });
    await seedAsh(t);

    await as.mutation(api.goals.addFromItem, { uniqueName: "/Lotus/Powersuits/Ninja/Ninja" });
    const first = await as.query(api.goals.list, {});
    await as.mutation(api.goals.addFromItem, { uniqueName: "/Lotus/Powersuits/Ninja/Ninja" });
    const second = await as.query(api.goals.list, {});

    expect(second.length).toBe(first.length);
    const before = first.find((goal) => goal.itemName === "Ash Neuroptics")?.wantedCount;
    const after = second.find((goal) => goal.itemName === "Ash Neuroptics")?.wantedCount;
    expect(after).toBe((before ?? 0) * 2);
  });

  test("the names to pick from come from the parts table, not from a bundled file", async () => {
    const t = setup();
    const as = t.withIdentity({ subject: await account(t) });
    expect(await as.query(api.goals.itemNames, {})).toEqual([]);

    await seedAsh(t);
    const names = (await as.query(api.goals.itemNames, {})).map((row) => row.name);
    expect(names).toContain("Ash");
    expect(names).toContain("Ash Chassis");
    expect(names).toContain("Rubedo");
  });

  test("a goal carries the places it drops from, best chance first", async () => {
    const t = setup();
    const as = t.withIdentity({ subject: await account(t) });
    await t.run(async (ctx) => {
      await ctx.db.insert("dropSources", {
        itemName: "Orokin Cell",
        sources: [
          { place: "Level 40 - 60 Orb Vallis Bounty", rotation: "A", chance: 33.33 },
          { place: "Corrupted Vor", rotation: "", chance: 50 },
        ],
      });
    });

    await as.mutation(api.goals.add, { itemName: "Orokin Cell", wantedCount: 5 });
    const [goal] = await as.query(api.goals.list, {});
    expect(goal.sources[0]).toEqual({ place: "Corrupted Vor", rotation: "", chance: 50 });
  });

  test("have is edited in place and the goal can be dropped", async () => {
    const t = setup();
    const as = t.withIdentity({ subject: await account(t) });
    const id = await as.mutation(api.goals.add, { itemName: "Rubedo", wantedCount: 1000 });

    await as.mutation(api.goals.setHave, { id, haveCount: 400 });
    expect((await as.query(api.goals.list, {}))[0].haveCount).toBe(400);
    await as.mutation(api.goals.remove, { id });
    expect(await as.query(api.goals.list, {})).toEqual([]);
  });

  test("another player cannot read or edit my goals", async () => {
    const t = setup();
    const mine = t.withIdentity({ subject: await account(t) });
    const theirs = t.withIdentity({ subject: await account(t) });
    const id = await mine.mutation(api.goals.add, { itemName: "Rubedo", wantedCount: 1000 });

    expect(await theirs.query(api.goals.list, {})).toEqual([]);
    await expect(theirs.mutation(api.goals.setHave, { id, haveCount: 999 })).rejects.toThrow();
    await expect(theirs.mutation(api.goals.remove, { id })).rejects.toThrow();
    expect((await mine.query(api.goals.list, {}))[0].haveCount).toBe(0);
  });

  test("a signed out visitor has no goals to read", async () => {
    const t = setup();
    await expect(t.query(api.goals.list, {})).rejects.toThrow();
  });
});
