import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import schema from "./schema";
import { internal } from "./_generated/api";

const im = vi.hoisted(() => ({ created: [] as string[], opened: [] as string[], sent: [] as string[] }));

vi.mock("spectrum-ts", () => ({ Spectrum: async () => ({}) }));

vi.mock("spectrum-ts/providers/imessage", () => ({
  imessage: Object.assign(() => ({
    space: {
      create: async (handle: string) => {
        im.created.push(handle);
        return { id: "space-1", send: async (text: string) => void im.sent.push(text) };
      },
      get: async (id: string) => {
        im.opened.push(id);
        return { id, send: async (text: string) => void im.sent.push(text) };
      },
    },
  }), { config: () => ({}) }),
}));

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => {
  im.created.length = 0;
  im.opened.length = 0;
  im.sent.length = 0;
  vi.stubEnv("SPECTRUM_PROJECT_ID", "project-1");
  vi.stubEnv("SPECTRUM_PROJECT_SECRET", "secret");
});
afterEach(() => vi.unstubAllEnvs());

async function withPhone(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
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
  });
}

describe("sending over iMessage", () => {
  test("the second alert lands in the conversation the user opted in through", async () => {
    const t = convexTest(schema, modules);
    await withPhone(t);

    await t.action(internal.photon.sendText, { phone: "+15550001234", text: "first" });
    await t.action(internal.photon.sendText, { phone: "+15550001234", text: "second" });

    expect(im.created).toEqual(["+15550001234"]);
    expect(im.opened).toEqual(["space-1"]);
    expect(im.sent).toEqual(["first", "second"]);
  });

  test("a space the webhook already recorded is reused, never recreated", async () => {
    const t = convexTest(schema, modules);
    await withPhone(t);
    await t.mutation(internal.profiles.linkInbound, {
      messageId: "m1",
      phone: "+15550001234",
      spaceId: "space-from-inbound",
      senderId: "+15550001234",
    });

    await t.action(internal.photon.sendText, { phone: "+15550001234", text: "hello" });

    expect(im.created).toEqual([]);
    expect(im.opened).toEqual(["space-from-inbound"]);
  });
});
