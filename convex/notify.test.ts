import { describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import rateLimiter from "@convex-dev/rate-limiter/test";
import schema from "./schema";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// The provider boundaries are mocked, the payloads they are handed are what these tests assert.
const sent = vi.hoisted(() => ({ emails: [] as { to: string; subject: string }[], texts: [] as { to: string; text: string }[] }));

vi.mock("./email", async () => {
  const { internalAction } = await import("./_generated/server");
  const { v } = await import("convex/values");
  return {
    sendEmail: internalAction({
      args: { to: v.string(), subject: v.string(), react: v.any() },
      returns: v.string(),
      handler: async (_ctx, { to, subject }) => {
        sent.emails.push({ to, subject });
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
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
}

type SeedOptions = {
  email?: string;
  channels?: ("email" | "imessage")[];
  profile?: { phone?: string; phoneVerifiedAt?: number; email?: string } | null;
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
        timezone: "UTC",
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
    const eventId = await ctx.db.insert("worldEvents", {
      platform: "pc" as const,
      kind: "fissure",
      key: "f1",
      startsAt: Date.now(),
      expiresAt: Date.now() + 3_600_000,
      seenAt: Date.now(),
      payload: {
        tier: "Axi",
        missionType: "Survival",
        node: "Ani (Void)",
        steelPath: false,
        storm: false,
        expiresAt: Date.now() + 3_600_000,
      },
    });
    return { userId: userId as Id<"users">, ruleId, eventId };
  });
}

describe("notify.send", () => {
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
