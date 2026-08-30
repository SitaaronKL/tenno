import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedItems(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("items", {
      uniqueName: "/Weapons/Braton",
      name: "Braton",
      category: "Primary",
      kind: "primary" as const,
      masteryReq: 0,
      masteryXp: 6000,
      buildable: false,
      components: [],
    });
    await ctx.db.insert("items", {
      uniqueName: "/Warframes/Excalibur",
      name: "Excalibur",
      category: "Warframes",
      kind: "warframe" as const,
      masteryReq: 0,
      masteryXp: 6000,
      buildable: true,
      components: [],
    });
  });
}

async function seedPlayer(t: ReturnType<typeof convexTest>, playerId: string, name: string) {
  await t.run(async (ctx) => {
    await ctx.db.insert("profileCache", {
      playerId,
      fetchedAt: Date.now(),
      displayName: name,
      masteryRank: 30,
      nodesCompleted: 200,
      xpByItem: [{ uniqueName: "/Weapons/Braton", xp: 6000 }],
    });
  });
}

async function userWithPlayerId(t: ReturnType<typeof convexTest>, email: string, playerId: string | null) {
  const userId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", { email });
    await ctx.db.insert("profiles", {
      userId: id,
      email,
      timezone: "UTC",
      digestHour: 9,
      platform: "pc" as const,
      ...(playerId ? { masteryPlayerId: playerId } : {}),
    });
    return id;
  });
  return t.withIdentity({ subject: `${userId}|session` });
}

describe("mastery", () => {
  test("a signed out visitor sees nothing", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.mastery.progress, {})).rejects.toThrow();
    await expect(t.query(api.mastery.items, {})).rejects.toThrow();
  });

  test("the roster is one read that does not depend on whose page it is", async () => {
    const t = convexTest(schema, modules);
    await seedItems(t);
    const alice = await userWithPlayerId(t, "a@example.com", "a".repeat(24));

    const items = await alice.query(api.mastery.items, {});
    expect(items.map((i) => i.name)).toEqual(["Braton", "Excalibur"]);
  });

  test("your page shows the profile you synced", async () => {
    const t = convexTest(schema, modules);
    await seedItems(t);
    const playerId = "a".repeat(24);
    await seedPlayer(t, playerId, "Alice");
    const alice = await userWithPlayerId(t, "a@example.com", playerId);

    const progress = await alice.query(api.mastery.progress, {});
    expect(progress.profile!.displayName).toBe("Alice");
    expect(progress.xpByItem).toEqual([{ uniqueName: "/Weapons/Braton", xp: 6000 }]);
  });

  test("somebody else's player id is not readable, even knowing it", async () => {
    const t = convexTest(schema, modules);
    await seedItems(t);
    const alicePlayerId = "a".repeat(24);
    await seedPlayer(t, alicePlayerId, "Alice");
    // Bob knows Alice's id but never saved it on his own profile.
    const bob = await userWithPlayerId(t, "b@example.com", null);

    const progress = await bob.query(api.mastery.progress, {});
    expect(progress.profile).toBe(null);
    expect(progress.xpByItem).toEqual([]);
  });

  test("an empty roster is empty, not somebody's mastery", async () => {
    const t = convexTest(schema, modules);
    const alice = await userWithPlayerId(t, "a@example.com", null);
    expect(await alice.query(api.mastery.items, {})).toEqual([]);
  });
});
