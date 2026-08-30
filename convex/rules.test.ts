import { describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import rateLimiter from "@convex-dev/rate-limiter/test";
import schema from "./schema";
import { internal } from "./_generated/api";
// This suite is about the rules engine, real delivery is covered by the email and photon tests.
vi.mock("./email", async () => {
  const { internalAction } = await import("./_generated/server");
  const { v } = await import("convex/values");
  return {
    sendEmail: internalAction({
      args: { to: v.string(), subject: v.string(), react: v.any() },
      returns: v.string(),
      handler: async () => "test-email-id",
    }),
  };
});

const modules = import.meta.glob("./**/*.ts");

function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
}

async function seed(t: ReturnType<typeof setup>, mode: "instant" | "digest") {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "tenno@example.com" });
    await ctx.db.insert("profiles", {
      userId,
      email: "tenno@example.com",
      timezone: "UTC",
      digestHour: 9,
      platform: "pc" as const,
    });
    const ruleId = await ctx.db.insert("rules", {
      userId,
      name: "Axi survival",
      filter: { kind: "fissure", tiers: ["Axi"], missionTypes: ["Survival"], steelPath: null, storm: null },
      mode,
      channels: ["email"],
      enabled: true,
      source: "manual" as const,
      createdAt: Date.now(),
    });
    const eventId = await ctx.db.insert("worldEvents", {
      platform: "pc",
      kind: "fissure",
      key: "f1",
      startsAt: Date.now(),
      seenAt: Date.now(),
      payload: { tier: "Axi", missionType: "Survival", node: "Ani (Void)", steelPath: false, storm: false },
    });
    return { userId, ruleId, eventId };
  });
}

describe("rules for the iMessage agent", () => {
  test("the agent can list and create rules for a phone's owner without a session", async () => {
    const t = setup();
    const { userId } = await seed(t, "instant");

    const created = await t.mutation(internal.rules.createForUser, {
      userId,
      input: {
        name: "Baro arrivals",
        filter: { kind: "baro", items: null },
        mode: "instant",
        channels: ["email"],
      },
    });
    expect(created).toBeTruthy();

    const rules = await t.query(internal.rules.listForUser, { userId });
    expect(rules.map((r) => r.name).sort()).toEqual(["Axi survival", "Baro arrivals"]);
  });
});

describe("rules.evaluate", () => {
  test("past the hourly limit a match is recorded as skipped, not dropped", async () => {
    const t = setup();
    const { userId } = await seed(t, "digest");
    const eventIds = await t.run(async (ctx) => {
      const ids = [];
      for (let i = 0; i < 31; i++) {
        ids.push(
          await ctx.db.insert("worldEvents", {
            platform: "pc" as const,
            kind: "fissure",
            key: `storm-${i}`,
            startsAt: Date.now(),
            seenAt: Date.now(),
            payload: { tier: "Axi", missionType: "Survival", node: "Ani (Void)", steelPath: false, storm: false },
          }),
        );
      }
      return ids;
    });

    await t.mutation(internal.rules.evaluate, { eventIds });

    const rows = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "skipped"))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].error).toBe("rate limited");
    const all = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(all).toHaveLength(31);
  });

  test("each channel of a two channel rule costs its own unit", async () => {
    const t = setup();
    const { userId, ruleId } = await seed(t, "digest");
    await t.run((ctx) => ctx.db.patch("rules", ruleId, { channels: ["email", "imessage"] }));
    const eventIds = await t.run(async (ctx) => {
      const ids = [];
      for (let i = 0; i < 16; i++) {
        ids.push(
          await ctx.db.insert("worldEvents", {
            platform: "pc" as const,
            kind: "fissure",
            key: `pair-${i}`,
            startsAt: Date.now(),
            seenAt: Date.now(),
            payload: { tier: "Axi", missionType: "Survival", node: "Ani (Void)", steelPath: false, storm: false },
          }),
        );
      }
      return ids;
    });

    await t.mutation(internal.rules.evaluate, { eventIds });

    const skipped = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "skipped"))
        .collect(),
    );
    // Thirty deliveries fit in the window, the last two are visible as skipped.
    expect(skipped).toHaveLength(2);
  });

  test("a matching rule queues one notification and sends it right away", async () => {
    const t = setup();
    const { eventId } = await seed(t, "instant");

    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    const queued = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(queued).toHaveLength(1);
    expect(queued[0].channel).toBe("email");
    expect(queued[0].status).toBe("pending");

    await t.finishAllScheduledFunctions(() => {});
    const after = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(after[0].status).toBe("sent");
  });

  test("evaluating the same event twice does not notify twice", async () => {
    const t = setup();
    const { eventId } = await seed(t, "instant");

    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });

    const queued = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(queued).toHaveLength(1);
  });

  test("a digest rule waits for the digest instead of sending", async () => {
    const t = setup();
    const { eventId } = await seed(t, "digest");

    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.finishAllScheduledFunctions(() => {});

    const queued = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(queued[0].status).toBe("pending");

    await t.action(internal.notify.digest, {});
    const after = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(after[0].status).toBe("sent");
  });

  test("an event no rule cares about notifies nobody", async () => {
    const t = setup();
    await seed(t, "instant");
    const otherId = await t.run((ctx) =>
      ctx.db.insert("worldEvents", {
        platform: "pc",
        kind: "fissure",
        key: "f2",
        startsAt: Date.now(),
        seenAt: Date.now(),
        payload: { tier: "Lith", missionType: "Capture" },
      }),
    );

    await t.mutation(internal.rules.evaluate, { eventIds: [otherId] });
    const queued = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(queued).toHaveLength(0);
  });
});
