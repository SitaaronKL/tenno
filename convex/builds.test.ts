import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { emptySlots } from "../lib/builds/capacity";

const modules = import.meta.glob("./**/*.ts");

async function twoUsers() {
  const t = convexTest(schema, modules);
  const [a, b] = await t.run(async (ctx) => [
    await ctx.db.insert("users", { email: "a@example.com" }),
    await ctx.db.insert("users", { email: "b@example.com" }),
  ]);
  await t.run(async (ctx) => {
    await ctx.db.insert("items", {
      uniqueName: "/Lotus/Powersuits/Rhino/Rhino",
      name: "Rhino",
      category: "Suits",
      kind: "warframe" as const,
      masteryReq: 0,
      masteryXp: 6000,
      buildable: true,
      components: [],
      stats: { health: 270, shield: 455, armor: 240, energy: 100, sprint: 0.95 },
    });
  });
  return {
    alice: t.withIdentity({ subject: `${a}|session` }),
    bob: t.withIdentity({ subject: `${b}|session` }),
  };
}

function draft(isPublic: boolean) {
  return {
    itemId: "/Lotus/Powersuits/Rhino/Rhino",
    name: "Iron Skin Rhino",
    slots: emptySlots(),
    public: isPublic,
  };
}

describe("builds", () => {
  test("a public build is readable by somebody else, and forkable", async () => {
    const { alice, bob } = await twoUsers();
    const id = await alice.mutation(api.builds.create, draft(true));

    const read = await bob.query(api.builds.get, { id });
    expect(read?.name).toBe("Iron Skin Rhino");
    // The item name is resolved, the table shows a frame, not a Lotus path.
    expect(read?.itemName).toBe("Rhino");
    expect(read?.mine).toBe(false);

    const forked = await bob.mutation(api.builds.fork, { id });
    const mine = await bob.query(api.builds.list, {});
    expect(mine.map((row) => row.name)).toEqual(["Iron Skin Rhino (fork)"]);
    // A fork starts private, sharing is the forker's decision.
    expect(mine[0]._id).toBe(forked);
    expect(mine[0].public).toBe(false);
  });

  test("a private build is the owner's alone", async () => {
    const { alice, bob } = await twoUsers();
    const id = await alice.mutation(api.builds.create, draft(false));

    await expect(bob.query(api.builds.get, { id })).rejects.toThrow("private");
    await expect(bob.mutation(api.builds.fork, { id })).rejects.toThrow("private");
    await expect(bob.mutation(api.builds.remove, { id })).rejects.toThrow("not yours");
    expect(await bob.query(api.builds.list, {})).toEqual([]);
    expect(await alice.query(api.builds.get, { id })).not.toBeNull();
  });

  test("sharing a build is one field, and the reader sees it right away", async () => {
    const { alice, bob } = await twoUsers();
    const id = await alice.mutation(api.builds.create, draft(false));

    await alice.mutation(api.builds.update, { id, public: true });

    expect((await bob.query(api.builds.get, { id }))?.public).toBe(true);
  });

  test("a build with the wrong number of mod slots is refused", async () => {
    const { alice } = await twoUsers();
    const slots = emptySlots();
    slots.mods = slots.mods.slice(0, 3);

    await expect(
      alice.mutation(api.builds.create, { ...draft(false), slots }),
    ).rejects.toThrow("exactly 8 mod slots");
  });
});
