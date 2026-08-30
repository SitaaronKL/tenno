import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-08-30T00:00:00.000Z");

describe("retention", () => {
  test("old world events go, this week's stay", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      for (const [key, ageDays] of [["stale", 10], ["fresh", 2]] as const) {
        await ctx.db.insert("worldEvents", {
          platform: "pc" as const,
          kind: "cycle",
          key,
          startsAt: NOW - ageDays * DAY,
          seenAt: NOW - ageDays * DAY,
          payload: {},
        });
      }
    });

    const swept = await t.mutation(internal.retention.sweep, { now: NOW });
    expect(swept.events).toBe(1);

    const left = await t.run(async (ctx) => await ctx.db.query("worldEvents").collect());
    expect(left.map((e) => e.key)).toEqual(["fresh"]);
  });

  test("a dedupe row older than a month goes, a recent one still stops a redelivery", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("photonInbound", { messageId: "old", receivedAt: NOW - 40 * DAY });
      await ctx.db.insert("photonInbound", { messageId: "recent", receivedAt: NOW - 3 * DAY });
    });

    const swept = await t.mutation(internal.retention.sweep, { now: NOW });
    expect(swept.inbound).toBe(1);

    const left = await t.run(async (ctx) => await ctx.db.query("photonInbound").collect());
    expect(left.map((r) => r.messageId)).toEqual(["recent"]);
  });
});
