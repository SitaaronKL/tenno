import { convexTest } from "convex-test";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

const MONDAY_MIDNIGHT = Date.parse("2026-08-31T00:00:00.000Z");
const TUESDAY_MIDNIGHT = Date.parse("2026-09-01T00:00:00.000Z");

describe("resets", () => {
  test("an hour that is not midnight UTC is not a reset", async () => {
    const t = convexTest(schema, modules);
    expect(await t.mutation(internal.resets.tick, { at: TUESDAY_MIDNIGHT + 60 * 60_000 })).toBe(0);
    const events = await t.run(async (ctx) => await ctx.db.query("worldEvents").collect());
    expect(events).toHaveLength(0);
  });

  test("midnight UTC on a Tuesday is the daily reset only", async () => {
    const t = convexTest(schema, modules);
    expect(await t.mutation(internal.resets.tick, { at: TUESDAY_MIDNIGHT })).toBe(1);
    const events = await t.run(async (ctx) => await ctx.db.query("worldEvents").collect());
    expect(events.map((e) => ({ kind: e.kind, key: e.key, period: e.payload.period }))).toEqual([
      { kind: "reset", key: "daily:2026-09-01", period: "daily" },
    ]);
    expect(events[0].startsAt).toBe(TUESDAY_MIDNIGHT);
  });

  test("Monday midnight UTC is both the daily and the weekly reset", async () => {
    const t = convexTest(schema, modules);
    expect(await t.mutation(internal.resets.tick, { at: MONDAY_MIDNIGHT })).toBe(2);
    const events = await t.run(async (ctx) => await ctx.db.query("worldEvents").collect());
    expect(events.map((e) => e.key).sort()).toEqual(["daily:2026-08-31", "weekly:2026-08-31"]);
  });

  test("a second run in the same hour cannot fire the reset twice", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.resets.tick, { at: MONDAY_MIDNIGHT });
    expect(await t.mutation(internal.resets.tick, { at: MONDAY_MIDNIGHT + 59 * 60_000 })).toBe(0);
    const events = await t.run(async (ctx) => await ctx.db.query("worldEvents").collect());
    expect(events).toHaveLength(2);
  });

  test("a reset rule is notified when the reset lands", async () => {
    const t = convexTest(schema, modules);
    rateLimiter.register(t);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "tenno@example.com" });
      await ctx.db.insert("rules", {
        userId,
        name: "Daily reset",
        filter: { kind: "reset", period: "daily" },
        mode: "digest" as const,
        channels: ["email" as const],
        enabled: true,
        source: "manual" as const,
        createdAt: MONDAY_MIDNIGHT,
      });
    });
    await t.mutation(internal.resets.tick, { at: MONDAY_MIDNIGHT });
    await t.finishAllScheduledFunctions(() => {});

    const notifications = await t.run(async (ctx) => await ctx.db.query("notifications").collect());
    expect(notifications).toHaveLength(1);
  });
});
