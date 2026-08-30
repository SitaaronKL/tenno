import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
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
