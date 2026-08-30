import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import schema from "./schema";

const sent = vi.hoisted(() => ({ texts: [] as { to: string; text: string }[], replies: [] as string[] }));

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
    reply: internalAction({
      args: { phone: v.string(), text: v.string() },
      returns: v.null(),
      handler: async (_ctx, { text }) => {
        sent.replies.push(text);
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
const SECRET = "webhook-secret";

function envelope(messageId: string, phone: string, text: string) {
  return JSON.stringify({
    event: "message.received",
    message: {
      id: messageId,
      space: { id: "space-1", platform: "imessage" },
      sender: { id: phone, platform: "imessage" },
      content: { type: "text", text },
    },
  });
}

async function signed(body: string) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`v0:${timestamp}:${body}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return {
    method: "POST",
    body,
    headers: {
      "x-spectrum-timestamp": timestamp,
      "x-spectrum-signature": `v0=${hex}`,
      "content-type": "application/json",
    },
  };
}

async function post(t: ReturnType<typeof convexTest>, body: string) {
  return await t.fetch("/photon/webhook", await signed(body));
}

function setup() {
  sent.texts.length = 0;
  sent.replies.length = 0;
  return convexTest(schema, modules);
}

beforeEach(() => vi.stubEnv("PHOTON_WEBHOOK_SECRET", SECRET));
afterEach(() => vi.unstubAllEnvs());

async function seedProfile(t: ReturnType<typeof convexTest>, phone: string) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "tenno@example.com" });
    await ctx.db.insert("profiles", {
      userId,
      email: "tenno@example.com",
      phone,
      timezone: "UTC",
      digestHour: 9,
      platform: "pc" as const,
    });
    return userId;
  });
}

describe("photon webhook", () => {
  test("an unsigned delivery is refused", async () => {
    const t = setup();
    const response = await t.fetch("/photon/webhook", {
      method: "POST",
      body: envelope("m1", "+15550001234", "START"),
    });
    expect(response.status).toBe(400);
  });

  test("the first text from a saved phone verifies it and says so", async () => {
    const t = setup();
    const userId = await seedProfile(t, "+15550001234");

    const response = await post(t, envelope("m1", "+1 (555) 000-1234", "START"));
    expect(response.status).toBe(200);
    await t.finishAllScheduledFunctions(() => {});

    const profile = await t.run(async (ctx) =>
      await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique(),
    );
    expect(profile!.phoneVerifiedAt).toBeTypeOf("number");
    expect(profile!.photonSpaceId).toBe("space-1");
    expect(sent.texts.map((m) => m.text)).toEqual(["Voidwatch linked. You will get alerts here."]);
    expect(sent.replies).toHaveLength(0);
  });

  test("a redelivered text is not answered twice", async () => {
    const t = setup();
    await seedProfile(t, "+15550001234");
    const body = envelope("m1", "+15550001234", "START");

    await post(t, body);
    await t.finishAllScheduledFunctions(() => {});
    const second = await post(t, body);
    await t.finishAllScheduledFunctions(() => {});

    expect(second.status).toBe(200);
    expect(sent.texts).toHaveLength(1);
    expect(sent.replies).toHaveLength(0);
  });

  test("a later text from a verified phone goes to the agent", async () => {
    const t = setup();
    await seedProfile(t, "+15550001234");

    await post(t, envelope("m1", "+15550001234", "START"));
    await t.finishAllScheduledFunctions(() => {});
    await post(t, envelope("m2", "+15550001234", "what fissures are up"));
    await t.finishAllScheduledFunctions(() => {});

    expect(sent.replies).toEqual(["what fissures are up"]);
  });
});
