import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const HOUR = 60 * 60 * 1000;

function setup() {
  return convexTest(schema, modules);
}

async function account(t: ReturnType<typeof setup>, anonymous = false) {
  return await t.run(async (ctx) =>
    anonymous
      ? await ctx.db.insert("users", { isAnonymous: true })
      : await ctx.db.insert("users", { email: "tenno@example.com" }),
  );
}

describe("check offs", () => {
  test("a tick is stored, a second tick takes it away", async () => {
    const t = setup();
    const userId = await account(t);
    const as = t.withIdentity({ subject: userId });
    const key = "sortie:s1:War (Mars)";

    expect(await as.query(api.completions.canSave, {})).toBe(true);
    expect(await as.query(api.completions.list, {})).toEqual([]);
    await as.mutation(api.completions.toggle, { key, expiresAt: Date.now() + HOUR });
    expect(await as.query(api.completions.list, {})).toEqual([key]);
    await as.mutation(api.completions.toggle, { key, expiresAt: Date.now() + HOUR });
    expect(await as.query(api.completions.list, {})).toEqual([]);
  });

  test("one player's ticks are invisible to another", async () => {
    const t = setup();
    const mine = await account(t);
    const theirs = await account(t);
    await t
      .withIdentity({ subject: mine })
      .mutation(api.completions.toggle, { key: "nightwave:a1", expiresAt: Date.now() + HOUR });

    expect(await t.withIdentity({ subject: theirs }).query(api.completions.list, {})).toEqual([]);
  });

  test("a rotation that has ended is no longer listed", async () => {
    const t = setup();
    const userId = await account(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("completions", {
        userId,
        key: "sortie:old:Node",
        expiresAt: Date.now() - HOUR,
        doneAt: Date.now() - 2 * HOUR,
      });
      await ctx.db.insert("completions", {
        userId,
        key: "sortie:new:Node",
        expiresAt: Date.now() + HOUR,
        doneAt: Date.now(),
      });
    });

    expect(await t.withIdentity({ subject: userId }).query(api.completions.list, {})).toEqual([
      "sortie:new:Node",
    ]);
  });

  test("a guest cannot tick anything off and sees an empty list", async () => {
    const t = setup();
    const guest = await account(t, true);
    const as = t.withIdentity({ subject: guest });

    await expect(
      as.mutation(api.completions.toggle, { key: "nightwave:a1", expiresAt: Date.now() + HOUR }),
    ).rejects.toThrow(/[Ss]ign in/);
    expect(await as.query(api.completions.list, {})).toEqual([]);
    expect(await as.query(api.completions.canSave, {})).toBe(false);
  });

  test("retention drops the rows whose rotation is over", async () => {
    const t = setup();
    const userId = await account(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("completions", {
        userId,
        key: "gone",
        expiresAt: Date.now() - HOUR,
        doneAt: Date.now() - 2 * HOUR,
      });
      await ctx.db.insert("completions", {
        userId,
        key: "here",
        expiresAt: Date.now() + HOUR,
        doneAt: Date.now(),
      });
    });

    const swept = await t.mutation(internal.retention.sweep, {});
    expect(swept.completions).toBe(1);
    const left = await t.run(async (ctx) => await ctx.db.query("completions").collect());
    expect(left.map((r) => r.key)).toEqual(["here"]);
  });
});
