import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import rateLimiter from "@convex-dev/rate-limiter/test";
import schema from "./schema";
import { internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
}

async function seed(t: ReturnType<typeof setup>, mode: "instant" | "digest") {
  return await t.run(async (ctx) => {
    await ctx.db.insert("profiles", {
      userId: "user1",
      email: "tenno@example.com",
      timezone: "UTC",
      digestHour: 9,
      platform: "pc" as const,
    });
    const ruleId = await ctx.db.insert("rules", {
      userId: "user1",
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
    return { ruleId, eventId };
  });
}

describe("rules.evaluate", () => {
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
