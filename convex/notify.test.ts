import { describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import rateLimiter from "@convex-dev/rate-limiter/test";
import schema from "./schema";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// The provider boundaries are mocked, the payloads they are handed are what these tests assert.
const sent = vi.hoisted(() => ({
  emails: [] as { to: string; subject: string; react: { props: Record<string, string> } }[],
  texts: [] as { to: string; text: string }[],
  failuresLeft: 0,
}));

vi.mock("./email", async () => {
  const { internalAction } = await import("./_generated/server");
  const { v } = await import("convex/values");
  return {
    sendEmail: internalAction({
      args: { to: v.string(), subject: v.string(), react: v.any() },
      returns: v.string(),
      handler: async (_ctx, { to, subject, react }) => {
        if (sent.failuresLeft > 0) {
          sent.failuresLeft -= 1;
          throw new Error("provider is having a moment");
        }
        sent.emails.push({ to, subject, react });
        return "test-email-id";
      },
    }),
  };
});

vi.mock("./photon", async () => {
  const { internalAction } = await import("./_generated/server");
  const { v } = await import("convex/values");
  return {
    sendText: internalAction({
      args: { photonUserId: v.optional(v.string()), phone: v.optional(v.string()), text: v.string() },
      returns: v.null(),
      handler: async (_ctx, { photonUserId, phone, text }) => {
        sent.texts.push({ to: phone ?? photonUserId ?? "", text });
        return null;
      },
    }),
    registerUser: internalAction({
      args: { phone: v.string() },
      returns: v.string(),
      handler: async () => "photon-user-1",
    }),
  };
});

const modules = import.meta.glob("./**/*.ts");

function setup() {
  sent.emails.length = 0;
  sent.texts.length = 0;
  sent.failuresLeft = 0;
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
}

type SeedOptions = {
  email?: string;
  channels?: ("email" | "imessage")[];
  profile?: { phone?: string; phoneVerifiedAt?: number; email?: string } | null;
  timezone?: string;
  expiresAt?: number;
};

async function seed(t: ReturnType<typeof setup>, options: SeedOptions = {}) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: options.email ?? "tenno@example.com" });
    if (options.profile) {
      await ctx.db.insert("profiles", {
        userId,
        email: options.profile.email ?? options.email ?? "tenno@example.com",
        phone: options.profile.phone,
        phoneVerifiedAt: options.profile.phoneVerifiedAt,
        timezone: options.timezone ?? "UTC",
        digestHour: 9,
        platform: "pc" as const,
      });
    }
    const ruleId = await ctx.db.insert("rules", {
      userId,
      name: "Axi survival",
      filter: { kind: "fissure", tiers: ["Axi"], missionTypes: ["Survival"], steelPath: null, storm: null },
      mode: "instant" as const,
      channels: options.channels ?? ["email"],
      enabled: true,
      source: "manual" as const,
      createdAt: Date.now(),
    });
    const expiresAt = options.expiresAt ?? Date.now() + 3_600_000;
    const eventId = await ctx.db.insert("worldEvents", {
      platform: "pc" as const,
      kind: "fissure",
      key: "f1",
      startsAt: Date.now(),
      expiresAt,
      seenAt: Date.now(),
      payload: {
        tier: "Axi",
        missionType: "Survival",
        node: "Ani (Void)",
        steelPath: false,
        storm: false,
        expiresAt,
      },
    });
    return { userId: userId as Id<"users">, ruleId, eventId };
  });
}

// 2026-08-30T13:00:00Z is 09:00 in New York.
const NINE_IN_NEW_YORK = Date.parse("2026-08-30T13:00:00.000Z");

async function seedDigest(t: ReturnType<typeof setup>, timezone: string, digestHour: number) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "tenno@example.com" });
    await ctx.db.insert("profiles", {
      userId,
      email: "tenno@example.com",
      timezone,
      digestHour,
      platform: "pc" as const,
    });
    const ruleId = await ctx.db.insert("rules", {
      userId,
      name: "Axi survival",
      filter: { kind: "fissure", tiers: ["Axi"], missionTypes: ["Survival"], steelPath: null, storm: null },
      mode: "digest" as const,
      channels: ["email"],
      enabled: true,
      source: "manual" as const,
      createdAt: Date.now(),
    });
    const eventId = await ctx.db.insert("worldEvents", {
      platform: "pc" as const,
      kind: "fissure",
      key: "f1",
      startsAt: Date.now(),
      seenAt: Date.now(),
      payload: { tier: "Axi", missionType: "Survival", node: "Ani (Void)", steelPath: false, storm: false },
    });
    await ctx.db.insert("notifications", {
      userId,
      ruleId,
      eventId,
      channel: "email" as const,
      mode: "digest" as const,
      status: "pending" as const,
      createdAt: Date.now(),
    });
    return { userId };
  });
}

describe("notify.digest", () => {
  test("the digest waits for the hour the user picked, in their timezone", async () => {
    const t = setup();
    await seedDigest(t, "America/New_York", 9);

    await t.action(internal.notify.digest, { now: NINE_IN_NEW_YORK - 3 * 3_600_000 });
    let rows = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(rows[0].status).toBe("pending");
    expect(sent.emails).toHaveLength(0);

    await t.action(internal.notify.digest, { now: NINE_IN_NEW_YORK });
    rows = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(rows[0].status).toBe("sent");
    expect(sent.emails).toHaveLength(1);
  });

  test("one local hour sends one digest, even if the cron runs again", async () => {
    const t = setup();
    await seedDigest(t, "America/New_York", 9);

    await t.action(internal.notify.digest, { now: NINE_IN_NEW_YORK });
    await t.action(internal.notify.digest, { now: NINE_IN_NEW_YORK + 60_000 });

    expect(sent.emails).toHaveLength(1);
  });
});

describe("notify.send", () => {
  test("the message names the fissure and when it ends, in the user's timezone", async () => {
    const t = setup();
    const { eventId } = await seed(t, {
      profile: { phone: undefined },
      timezone: "America/New_York",
      expiresAt: Date.parse("2026-08-30T18:30:00.000Z"),
    });

    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.finishAllScheduledFunctions(() => {});

    const props = sent.emails[0].react.props;
    expect(props.title).toContain("Axi");
    expect(props.title).toContain("Survival");
    expect(props.title).toContain("Ani (Void)");
    // 18:30 UTC is 14:30 in New York.
    expect(props.expiresAt).toContain("2:30");
  });

  test("a provider blip is retried, the user still gets the mail", async () => {
    const t = setup();
    sent.failuresLeft = 1;
    const { eventId } = await seed(t, { profile: null });

    vi.useFakeTimers();
    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();

    const rows = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(rows[0].status).toBe("sent");
    expect(rows[0].attempts).toBe(2);
    expect(sent.emails).toHaveLength(1);
  });

  test("a provider that stays down leaves the notification failed, not retrying forever", async () => {
    const t = setup();
    sent.failuresLeft = 10;
    const { eventId } = await seed(t, { profile: null });

    vi.useFakeTimers();
    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();

    const rows = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(rows[0].status).toBe("failed");
    expect(rows[0].attempts).toBe(3);
  });

  test("an unverified phone is never texted, the user sees why", async () => {
    const t = setup();
    const { eventId } = await seed(t, {
      channels: ["imessage"],
      profile: { phone: "+15550001234" },
    });

    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.finishAllScheduledFunctions(() => {});

    const rows = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(rows[0].status).toBe("skipped");
    expect(rows[0].error).toBe("phone not verified");
    expect(sent.texts).toHaveLength(0);
  });

  test("a verified phone gets the text", async () => {
    const t = setup();
    const { eventId } = await seed(t, {
      channels: ["imessage"],
      profile: { phone: "+15550001234", phoneVerifiedAt: Date.now() },
    });

    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.finishAllScheduledFunctions(() => {});

    const rows = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(rows[0].status).toBe("sent");
    expect(sent.texts).toHaveLength(1);
  });

  test("a brand new user is emailed at the address they signed in with", async () => {
    const t = setup();
    // No profile row yet, the user has never opened settings.
    const { eventId } = await seed(t, { profile: null });

    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.finishAllScheduledFunctions(() => {});

    const rows = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(rows[0].status).toBe("sent");
    expect(sent.emails).toHaveLength(1);
    expect(sent.emails[0].to).toBe("tenno@example.com");
  });

  test("a user with no address anywhere is skipped, never left pending", async () => {
    const t = setup();
    const { eventId } = await seed(t, { email: "", profile: null });

    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.finishAllScheduledFunctions(() => {});

    const rows = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(rows[0].status).toBe("skipped");
    expect(rows[0].error).toBe("no email on file");
    expect(sent.emails).toHaveLength(0);
  });
});
