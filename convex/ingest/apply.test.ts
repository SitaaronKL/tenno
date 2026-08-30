import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import raw from "./__fixtures__/pc.json";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import { normalize } from "./normalize";
import { normalizeDe } from "./de";
import de from "./__fixtures__/de.json";

// convex-test wants paths relative to the convex root, this test sits one directory down.
const modules = Object.fromEntries(
  Object.entries(import.meta.glob("../**/*.ts")).map(([path, load]) => [
    path.startsWith("../") ? path.replace("../", "./") : path.replace("./", "./ingest/"),
    load,
  ]),
);
const FETCHED_AT = Date.parse("2026-08-30T01:17:00.000Z");

function state(fetchedAt = FETCHED_AT) {
  return normalize(raw as Record<string, unknown>, fetchedAt);
}

describe("apply", () => {
  test("says nothing about Baro until he arrives", async () => {
    const t = convexTest(schema, modules);
    const away = state();
    expect(away.baro!.active).toBe(false);
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: away });

    const quiet = await t.run(async (ctx) =>
      await ctx.db.query("worldEvents").collect(),
    );
    expect(quiet.filter((e) => e.kind === "baro")).toHaveLength(0);

    const arrived = state();
    arrived.baro = { ...arrived.baro!, active: true, startsAt: FETCHED_AT - 1000 };
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: arrived });

    const events = await t.run(async (ctx) => await ctx.db.query("worldEvents").collect());
    expect(events.filter((e) => e.kind === "baro")).toHaveLength(1);
  });

  test("one nightwave notification per weekly rollover, not one per act", async () => {
    const t = convexTest(schema, modules);
    const current = state();
    expect(current.nightwave!.acts.filter((a) => !a.daily).length).toBeGreaterThan(1);
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: current });

    const events = await t.run(async (ctx) => await ctx.db.query("worldEvents").collect());
    expect(events.filter((e) => e.kind === "nightwave")).toHaveLength(1);
  });

  test("next week's acts are a new nightwave notification, same season", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: state() });

    // Same season, same season expiry, the weekly acts rolled over.
    const week = 7 * 24 * 60 * 60_000;
    const next = state(FETCHED_AT + week);
    next.nightwave = {
      ...next.nightwave!,
      acts: next.nightwave!.acts.map((a) =>
        a.daily ? a : { ...a, key: `${a.key}-w2`, expiresAt: a.expiresAt + week },
      ),
    };
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: next });

    const events = await t.run(async (ctx) => await ctx.db.query("worldEvents").collect());
    expect(events.filter((e) => e.kind === "nightwave")).toHaveLength(2);
  });

  test("a second pull inside the same week says nothing new about nightwave", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: state() });
    await t.mutation(internal.ingest.apply.apply, {
      platform: "pc",
      state: state(FETCHED_AT + 5 * 60_000),
    });

    const events = await t.run(async (ctx) => await ctx.db.query("worldEvents").collect());
    expect(events.filter((e) => e.kind === "nightwave")).toHaveLength(1);
  });

  test("stores the world state the dashboard reads", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: state() });

    const stored = (await t.query(api.worldstate.get, { platform: "pc" }))!;
    expect(stored.sortie!.boss).toBe("Tyl Regor");
    // The snapshot keeps every fissure upstream sent, the read hides the expired ones.
    const row = await t.run(async (ctx) => await ctx.db.query("worldState").unique());
    expect(row!.data.fissures.length).toBeGreaterThan(0);
  });

  test("replaces the stored state on the next pull instead of piling up", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: state() });
    const later = FETCHED_AT + 5 * 60_000;
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: state(later) });

    const stored = (await t.query(api.worldstate.get, { platform: "pc" }))!;
    expect(stored.fetchedAt).toBe(later);
    const rows = await t.run(async (ctx) => await ctx.db.query("worldState").collect());
    expect(rows).toHaveLength(1);
  });

  test("records every new entity once, so a rule never fires twice for it", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: state() });
    expect(first).toBeGreaterThan(0);

    const second = await t.mutation(internal.ingest.apply.apply, {
      platform: "pc",
      state: state(FETCHED_AT + 5 * 60_000),
    });
    expect(second).toBe(0);

    const events = await t.run(async (ctx) => await ctx.db.query("worldEvents").collect());
    expect(events).toHaveLength(first);
    const keys = events.map((e) => `${e.kind}:${e.key}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("records the kinds rules can be written against", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: state() });

    const events = await t.run(async (ctx) => await ctx.db.query("worldEvents").collect());
    const kinds = new Set(events.map((e) => e.kind));
    for (const kind of ["fissure", "alert", "invasion", "sortie", "archonHunt", "nightwave", "cycle"]) {
      expect([...kinds]).toContain(kind);
    }
  });

  test("keeps a new fissure separate from the one already seen", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: state() });

    const next = state(FETCHED_AT + 60_000);
    next.fissures.push({ ...next.fissures[0], key: "brand-new-fissure", node: "Ceres (Ceres)" });
    const added = await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: next });
    expect(added).toBe(1);

    const event = await t.run(async (ctx) =>
      await ctx.db
        .query("worldEvents")
        .withIndex("by_platform_kind_key", (q) =>
          q.eq("platform", "pc").eq("kind", "fissure").eq("key", "brand-new-fissure"),
        )
        .unique(),
    );
    expect(event!.payload.node).toBe("Ceres (Ceres)");
  });
});

describe("cycle events", () => {
  test("two pulls five minutes apart leave one event per world, so a cycle rule fires once", async () => {
    const t = convexTest(schema, modules);
    // Millisecond remainders differ between cron runs, the key must not.
    await t.mutation(internal.ingest.apply.apply, {
      platform: "pc",
      state: normalizeDe(de as Record<string, unknown>, FETCHED_AT + 84),
    });
    await t.mutation(internal.ingest.apply.apply, {
      platform: "pc",
      state: normalizeDe(de as Record<string, unknown>, FETCHED_AT + 5 * 60_000 + 133),
    });

    const cycles = await t.run(async (ctx) =>
      (await ctx.db.query("worldEvents").collect()).filter((e) => e.kind === "cycle"),
    );
    const worlds = cycles.map((e) => e.key.split(":")[0]);
    expect(new Set(worlds).size).toBe(worlds.length);
    expect(worlds).toContain("earth");
  });
});

describe("what apply is willing to notify about", () => {
  test("an entity that already expired is not recorded, so nobody is told about it", async () => {
    const t = convexTest(schema, modules);
    // The fixture's newest fissure expires at 02:57Z, read the snapshot a day later.
    const late = state(FETCHED_AT + 24 * 60 * 60_000);
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: late });

    const events = await t.run(async (ctx) => await ctx.db.query("worldEvents").collect());
    expect(events.filter((e) => e.kind === "fissure")).toHaveLength(0);
    for (const event of events) {
      if (event.expiresAt !== undefined) expect(event.expiresAt).toBeGreaterThan(late.fetchedAt);
    }
  });

  test("the first ingest after a deploy records history without texting anybody", async () => {
    const t = convexTest(schema, modules);
    const cold = await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: state() });
    expect(cold).toBeGreaterThan(0);
    // A cold start is the whole world at once, it is history, not news.
    const events = await t.run(async (ctx) => await ctx.db.query("worldEvents").collect());
    expect(events.length).toBe(cold);
    expect(await t.run(async (ctx) => (await ctx.db.system.query("_scheduled_functions").collect()).length)).toBe(0);

    const next = state(FETCHED_AT + 60_000);
    next.fissures.push({ ...next.fissures[0], key: "fresh-fissure" });
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: next });
    expect(
      await t.run(async (ctx) => (await ctx.db.system.query("_scheduled_functions").collect()).length),
    ).toBe(1);
  });
});

describe("worldstate.get", () => {
  test("answers the same thing whatever the clock says", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: state() });

    const now = await t.query(api.worldstate.get, { platform: "pc" });
    vi.spyOn(Date, "now").mockReturnValue(FETCHED_AT + 30 * 24 * 60 * 60_000);
    const muchLater = await t.query(api.worldstate.get, { platform: "pc" });
    vi.restoreAllMocks();
    expect(muchLater).toEqual(now);
    expect(now!.fissures.length).toBeGreaterThan(0);
  });

  test("hands the panels fissures in relic order", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: state() });

    const tiers = (await t.query(api.worldstate.get, { platform: "pc" }))!.fissures.map((f) => f.tier);
    const order = ["Lith", "Meso", "Neo", "Axi", "Requiem", "Omnia"];
    const ranks = tiers.map((tier) => order.indexOf(tier));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  test("one bounty event per board rotation, keyed by syndicate and expiry", async () => {
    const t = convexTest(schema, modules);
    const current = state();
    expect(current.bounties!.length).toBeGreaterThan(1);
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: current });

    const first = await t.run(async (ctx) => await ctx.db.query("worldEvents").collect());
    const boards = first.filter((e) => e.kind === "bounty");
    expect(boards).toHaveLength(current.bounties!.length);
    expect(boards[0].payload.jobs.length).toBeGreaterThan(0);

    // The same rotation pulled again is not news.
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: state(FETCHED_AT + 60_000) });
    const second = await t.run(async (ctx) => await ctx.db.query("worldEvents").collect());
    expect(second.filter((e) => e.kind === "bounty")).toHaveLength(boards.length);

    // A new rotation is.
    const rolled = state(FETCHED_AT + 120_000);
    rolled.bounties = rolled.bounties!.map((b) => ({ ...b, expiresAt: b.expiresAt + 3 * 60 * 60_000 }));
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: rolled });
    const third = await t.run(async (ctx) => await ctx.db.query("worldEvents").collect());
    expect(third.filter((e) => e.kind === "bounty")).toHaveLength(boards.length * 2);
  });

  test("prune drops what expired so the stored snapshot does not grow stale", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: state() });
    expect((await t.query(api.worldstate.get, { platform: "pc" }))!.fissures.length).toBeGreaterThan(0);

    await t.mutation(internal.ingest.prune.prune, {
      platform: "pc",
      now: FETCHED_AT + 24 * 60 * 60_000,
    });
    expect((await t.query(api.worldstate.get, { platform: "pc" }))!.fissures).toHaveLength(0);
  });
});
