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
  notConfigured: false,
  cooling: false,
}));

vi.mock("./email", async () => {
  const { internalAction } = await import("./_generated/server");
  const { v } = await import("convex/values");
  return {
    sendEmail: internalAction({
      args: { to: v.string(), subject: v.string(), react: v.any() },
      returns: v.string(),
      handler: async (_ctx, { to, subject, react }) => {
        if (sent.notConfigured) throw new Error("email not configured");
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
        if (sent.cooling)
          throw new Error(
            "Uncaught RateLimitError: [upstream] Recipient has not replied; cooling period limits sends to 3/day",
          );
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
  sent.notConfigured = false;
  sent.cooling = false;
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
}

describe("the test notification", () => {
  test("a verified phone gets a test text", async () => {
    const t = setup();
    const userId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "tenno@example.com" });
      await ctx.db.insert("profiles", {
        userId,
        email: "tenno@example.com",
        phone: "+15550001234",
        phoneVerifiedAt: Date.now(),
        timezone: "UTC",
        digestHour: 9,
        platform: "pc" as const,
      });
      return userId;
    });

    const answer = await t.action(internal.notify.sendTest, { userId, channel: "imessage" });

    expect(answer).toContain("sent");
    expect(sent.texts).toHaveLength(1);
    expect(sent.texts[0].to).toBe("+15550001234");
  });

  test("an unverified phone is told why nothing arrived", async () => {
    const t = setup();
    const userId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "tenno@example.com" });
      await ctx.db.insert("profiles", {
        userId,
        email: "tenno@example.com",
        phone: "+15550001234",
        timezone: "UTC",
        digestHour: 9,
        platform: "pc" as const,
      });
      return userId;
    });

    const answer = await t.action(internal.notify.sendTest, { userId, channel: "imessage" });

    expect(answer).toContain("not verified");
    expect(sent.texts).toHaveLength(0);
  });

  test("email gets a test mail with the rule match shape", async () => {
    const t = setup();
    const userId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "tenno@example.com" });
      await ctx.db.insert("profiles", {
        userId,
        email: "tenno@example.com",
        timezone: "UTC",
        digestHour: 9,
        platform: "pc" as const,
      });
      return userId;
    });

    const answer = await t.action(internal.notify.sendTest, { userId, channel: "email" });

    expect(answer).toContain("sent");
    expect(sent.emails).toHaveLength(1);
    expect(sent.emails[0].to).toBe("tenno@example.com");
  });
});

describe("when Photon is cooling", () => {
  test("the alert falls back to email instead of retrying into the cap", async () => {
    const t = setup();
    sent.cooling = true;
    const { eventId } = await seed(t, {
      channels: ["imessage"],
      profile: { phone: "+15550001234", phoneVerifiedAt: Date.now() },
    });

    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.finishAllScheduledFunctions(() => {});

    // No text landed, the same line went out by mail, and nothing is left pending to retry.
    expect(sent.texts).toHaveLength(0);
    expect(sent.emails).toHaveLength(1);
    expect(sent.emails[0].subject).toContain("Axi survival");
    const rows = await t.run(async (ctx) => await ctx.db.query("notifications").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("skipped");
    expect(rows[0].error).toMatch(/cooling/i);
    expect(rows[0].attempts).toBe(1);
  });

  test("no duplicate mail when the rule already emails", async () => {
    const t = setup();
    sent.cooling = true;
    const { eventId } = await seed(t, {
      channels: ["email", "imessage"],
      profile: { phone: "+15550001234", phoneVerifiedAt: Date.now() },
    });

    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.finishAllScheduledFunctions(() => {});

    // The email channel already carries the alert, the fallback must not double it.
    expect(sent.emails).toHaveLength(1);
  });
});

describe("what a bounty text says", () => {
  test("names the board and the matched rows, never the word bounty", async () => {
    const t = setup();
    const { eventId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "tenno@example.com" });
      await ctx.db.insert("profiles", {
        userId,
        email: "tenno@example.com",
        phone: "+15550001234",
        phoneVerifiedAt: Date.now(),
        timezone: "UTC",
        digestHour: 9,
        platform: "pc" as const,
      });
      await ctx.db.insert("rules", {
        userId,
        name: "Top Exterminate",
        filter: { kind: "bounty", syndicates: null, level: "top", missionTypes: ["Exterminate"] },
        mode: "instant" as const,
        channels: ["imessage" as const],
        enabled: true,
        source: "manual" as const,
        createdAt: Date.now(),
      });
      const eventId = await ctx.db.insert("worldEvents", {
        platform: "pc" as const,
        kind: "bounty",
        key: "The Hex:123",
        startsAt: Date.now(),
        expiresAt: Date.now() + 3_600_000,
        seenAt: Date.now(),
        payload: {
          syndicate: "The Hex",
          jobs: [
            { missionType: "Defense", minLevel: 55, maxLevel: 60 },
            { missionType: "Extermination", minLevel: 65, maxLevel: 70 },
            { missionType: "Survival", minLevel: 75, maxLevel: 80 },
            { missionType: "Assassination", minLevel: 85, maxLevel: 90 },
            { missionType: "Extermination", minLevel: 95, maxLevel: 100 },
            { missionType: "Legacyte Harvest", minLevel: 105, maxLevel: 110 },
            {
              missionType: "Extermination",
              minLevel: 115,
              maxLevel: 120,
              challenge: "Exterminate without abilities",
            },
          ],
        },
      });
      return { eventId };
    });

    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.finishAllScheduledFunctions(() => {});

    expect(sent.texts).toHaveLength(1);
    const body = sent.texts[0].text;
    // The bonus objective rides along, so the reader knows the catch before loading in.
    expect(body).toContain("Extermination 115-120 (Exterminate without abilities) on The Hex");
    expect(body).not.toMatch(/: bounty/);
  });
});

describe("what the weekly brief says", () => {
  test("reads the week in sections and honors the toggles", async () => {
    const t = setup();
    const { eventId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "tenno@example.com" });
      await ctx.db.insert("profiles", {
        userId,
        email: "tenno@example.com",
        phone: "+15550001234",
        phoneVerifiedAt: Date.now(),
        timezone: "UTC",
        digestHour: 9,
        platform: "pc" as const,
      });
      await ctx.db.insert("rules", {
        userId,
        name: "Weekly briefing",
        filter: { kind: "weeklyBrief", circuit: true, teshin: false, archimedea: true },
        mode: "instant" as const,
        channels: ["imessage" as const],
        enabled: true,
        source: "manual" as const,
        createdAt: Date.now(),
      });
      const eventId = await ctx.db.insert("worldEvents", {
        platform: "pc" as const,
        kind: "circuit",
        key: "circuit:123",
        startsAt: Date.now(),
        expiresAt: Date.now() + 7 * 86_400_000,
        seenAt: Date.now(),
        payload: {
          normal: ["Garuda", "Baruuk", "Hildryn"],
          steelPath: ["Boar", "Gammacor"],
          expiresAt: Date.now() + 7 * 86_400_000,
          archimedea: [
            {
              variant: "deep",
              missions: [{ missionType: "Survival" }, { missionType: "Defense" }],
            },
          ],
        },
      });
      return { eventId };
    });

    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.finishAllScheduledFunctions(() => {});

    expect(sent.texts).toHaveLength(1);
    const body = sent.texts[0].text;
    expect(body).toContain("circuit: Garuda, Baruuk, Hildryn");
    expect(body).toContain("sp incarnons: Boar, Gammacor");
    expect(body).toContain("deep archimedea: Survival, Defense");
    expect(body).not.toMatch(/teshin/i);
  });
});

describe("what a reset text says", () => {
  test("reads as the reset, not the word reset twice", async () => {
    const t = setup();
    const { eventId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "tenno@example.com" });
      await ctx.db.insert("profiles", {
        userId,
        email: "tenno@example.com",
        phone: "+15550001234",
        phoneVerifiedAt: Date.now(),
        timezone: "UTC",
        digestHour: 9,
        platform: "pc" as const,
      });
      await ctx.db.insert("rules", {
        userId,
        name: "Daily reset",
        filter: { kind: "reset", period: "daily" },
        mode: "instant" as const,
        channels: ["imessage" as const],
        enabled: true,
        source: "manual" as const,
        createdAt: Date.now(),
      });
      const eventId = await ctx.db.insert("worldEvents", {
        platform: "pc" as const,
        kind: "reset",
        key: "daily:1",
        startsAt: Date.now(),
        expiresAt: Date.now() + 3_600_000,
        seenAt: Date.now(),
        payload: { period: "daily" },
      });
      return { eventId };
    });

    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.finishAllScheduledFunctions(() => {});

    expect(sent.texts).toHaveLength(1);
    expect(sent.texts[0].text).toContain("dailies are fresh");
  });
});

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
    expect(rows[0].status).toBe("queued");
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
    expect(rows[0].status).toBe("queued");
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
    expect(rows[0].status).toBe("queued");
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

describe("the digest under load", () => {
  test("two crons for the same hour send one digest, not two", async () => {
    const t = setup();
    const { userId } = await seedDigest(t, "America/New_York", 9);

    // Both runs read the user as due before either has finished sending.
    const claimed = await t.mutation(internal.notify.claimDigest, {
      userId,
      now: NINE_IN_NEW_YORK,
    });
    const second = await t.mutation(internal.notify.claimDigest, {
      userId,
      now: NINE_IN_NEW_YORK,
    });

    expect(claimed).toBe(true);
    expect(second).toBe(false);
  });

  test("a second cron in the same hour does not mail the user again", async () => {
    const t = setup();
    await seedDigest(t, "America/New_York", 9);

    await t.action(internal.notify.digest, { now: NINE_IN_NEW_YORK });
    await t.action(internal.notify.digest, { now: NINE_IN_NEW_YORK });

    // The hour was claimed by the first run, the second one leaves it alone.
    expect(sent.emails).toHaveLength(1);
  });

  test("a provider blip does not lose a whole digest", async () => {
    const t = setup();
    await seedDigest(t, "America/New_York", 9);
    sent.failuresLeft = 1;
    vi.useFakeTimers();

    await t.action(internal.notify.digest, { now: NINE_IN_NEW_YORK });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();

    expect(sent.emails).toHaveLength(1);
    const rows = await t.run(async (ctx) => await ctx.db.query("notifications").collect());
    expect(rows.map((r) => r.status)).toEqual(["queued"]);
  });

  test("a provider that stays down leaves the digest failed, not retrying forever", async () => {
    const t = setup();
    await seedDigest(t, "America/New_York", 9);
    sent.failuresLeft = 99;
    vi.useFakeTimers();

    await t.action(internal.notify.digest, { now: NINE_IN_NEW_YORK });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();

    const rows = await t.run(async (ctx) => await ctx.db.query("notifications").collect());
    expect(rows.map((r) => r.status)).toEqual(["failed"]);
    expect(rows[0].attempts).toBe(3);
  });

  test("digest rows are found without reading the instant queue first", async () => {
    const t = setup();
    const { userId } = await seedDigest(t, "America/New_York", 9);
    // A pile of instant rows ahead of the digest row must not be read to find it.
    await t.run(async (ctx) => {
      const rule = (await ctx.db.query("rules").first())!;
      const event = (await ctx.db.query("worldEvents").first())!;
      for (let i = 0; i < 300; i++) {
        await ctx.db.insert("notifications", {
          userId,
          ruleId: rule._id,
          eventId: event._id,
          channel: "email" as const,
          mode: "instant" as const,
          status: "pending" as const,
          createdAt: Date.now(),
        });
      }
    });

    const pending = await t.query(internal.notify.pendingDigestFor, { userId });
    expect(pending).toHaveLength(1);
  });
});

// The shape Resend posts to the delivery webhook.
function resendEvent(type: "email.delivered" | "email.bounced") {
  const at = new Date().toISOString();
  return {
    type,
    created_at: at,
    data: {
      created_at: at,
      email_id: "test-email-id",
      from: "alerts@voidwatch.app",
      to: "tenno@example.com",
      subject: "Voidwatch: Axi survival",
      ...(type === "email.bounced"
        ? { bounce: { type: "Permanent", message: "no such address", subType: "General" } }
        : {}),
    },
  } as never;
}

describe("what an email status means", () => {
  test("email reads queued until Resend says it landed, then sent", async () => {
    const t = setup();
    const { eventId } = await seed(t, { profile: null });

    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.finishAllScheduledFunctions(() => {});

    let rows = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(rows[0].status).toBe("queued");
    expect(rows[0].emailId).toBe("test-email-id");

    await t.mutation(internal.notify.onEmailEvent, {
      id: "test-email-id" as never,
      event: resendEvent("email.delivered"),
    });

    rows = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(rows[0].status).toBe("sent");
    expect(rows[0].sentAt).toBeTypeOf("number");
  });

  test("a bounce moves the row to failed, not left reading sent", async () => {
    const t = setup();
    const { eventId } = await seed(t, { profile: null });
    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.finishAllScheduledFunctions(() => {});

    await t.mutation(internal.notify.onEmailEvent, {
      id: "test-email-id" as never,
      event: resendEvent("email.bounced"),
    });

    const rows = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(rows[0].status).toBe("failed");
  });

  test("with no Resend key the row is skipped at once, saying why", async () => {
    const t = setup();
    sent.notConfigured = true;
    const { eventId } = await seed(t, { profile: null });

    vi.useFakeTimers();
    await t.mutation(internal.rules.evaluate, { eventIds: [eventId] });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();

    const rows = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(rows[0].status).toBe("skipped");
    expect(rows[0].error).toBe("email not configured");
    // One try, not three: no key is not a blip.
    expect(rows[0].attempts).toBe(1);
  });
});
