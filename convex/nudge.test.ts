import { describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const sent = vi.hoisted(() => ({ texts: [] as { to: string; text: string }[] }));

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

const DAY = 86_400_000;

type SeedOver = {
  lastInboundAt?: number;
  lastNudgeAt?: number;
  channels?: ("email" | "imessage")[];
};

async function seed(t: ReturnType<typeof convexTest>, over: SeedOver = {}) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "tenno@example.com" });
    await ctx.db.insert("profiles", {
      userId,
      email: "tenno@example.com",
      phone: "+15550001234",
      phoneVerifiedAt: Date.now() - 30 * DAY,
      lastInboundAt: over.lastInboundAt,
      lastNudgeAt: over.lastNudgeAt,
      timezone: "UTC",
      digestHour: 9,
      platform: "pc" as const,
    });
    await ctx.db.insert("rules", {
      userId,
      name: "Axi survival",
      filter: { kind: "fissure", tiers: ["Axi"], missionTypes: null, steelPath: null, storm: null },
      mode: "instant" as const,
      channels: over.channels ?? ["imessage" as const],
      enabled: true,
      source: "manual" as const,
      createdAt: Date.now(),
    });
    return userId as Id<"users">;
  });
}

function setup() {
  sent.texts.length = 0;
  return convexTest(schema, modules);
}

describe("the quiet line nudge", () => {
  test("a quiet user with iMessage rules gets one nudge", async () => {
    const t = setup();
    await seed(t, { lastInboundAt: Date.now() - 3 * DAY });

    await t.action(internal.nudge.run, {});

    expect(sent.texts).toHaveLength(1);
    expect(sent.texts[0].to).toBe("+15550001234");
    expect(sent.texts[0].text).toMatch(/send anything back/i);

    // The next sweep stays quiet, one nudge is enough for a while.
    await t.action(internal.nudge.run, {});
    expect(sent.texts).toHaveLength(1);
  });

  test("someone who texted recently is left alone", async () => {
    const t = setup();
    await seed(t, { lastInboundAt: Date.now() - DAY / 2 });

    await t.action(internal.nudge.run, {});

    expect(sent.texts).toHaveLength(0);
  });

  test("email only users are never texted", async () => {
    const t = setup();
    await seed(t, { lastInboundAt: Date.now() - 10 * DAY, channels: ["email"] });

    await t.action(internal.nudge.run, {});

    expect(sent.texts).toHaveLength(0);
  });

  test("an inbound text counts as contact", async () => {
    const t = setup();
    await seed(t, { lastInboundAt: Date.now() - 10 * DAY });
    await t.mutation(internal.profiles.linkInbound, {
      messageId: "m-fresh",
      phone: "+15550001234",
      spaceId: "space-1",
      senderId: "+15550001234",
    });

    await t.action(internal.nudge.run, {});

    expect(sent.texts).toHaveLength(0);
  });
});
