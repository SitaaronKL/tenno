import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function signedIn() {
  const t = convexTest(schema, modules);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "tenno@example.com" }));
  return t.withIdentity({ subject: `${userId}|session` });
}

describe("profiles", () => {
  test("signing up gives the user a profile row with their email", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "tenno@example.com" }));
    await t.mutation(internal.profiles.ensure, { userId });
    await t.mutation(internal.profiles.ensure, { userId });

    const rows = await t.run(async (ctx) => ctx.db.query("profiles").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("tenno@example.com");
  });

  test("a signed out visitor cannot read a profile", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.profiles.me, {})).rejects.toThrow();
  });

  test("a new user sees their email and sensible defaults", async () => {
    const asUser = await signedIn();
    const me = await asUser.query(api.profiles.me, {});
    expect(me.user.email).toBe("tenno@example.com");
    expect(me.profile.email).toBe("tenno@example.com");
    expect(me.profile.phone).toBe(null);
    expect(me.profile.digestHour).toBe(9);
    expect(me.profile.platform).toBe("pc");
  });

  test("saved settings come back on the next read", async () => {
    const asUser = await signedIn();
    await asUser.mutation(api.profiles.update, {
      timezone: "America/New_York",
      digestHour: 18,
      phone: "+15550100",
    });
    const me = await asUser.query(api.profiles.me, {});
    expect(me.profile.timezone).toBe("America/New_York");
    expect(me.profile.digestHour).toBe(18);
    expect(me.profile.phone).toBe("+15550100");
    expect(me.profile.phoneVerified).toBe(false);
  });

  test("one user never sees another user's settings", async () => {
    const first = await signedIn();
    await first.mutation(api.profiles.update, { timezone: "Europe/Berlin" });
    const second = await signedIn();
    const me = await second.query(api.profiles.me, {});
    expect(me.profile.timezone).toBe("UTC");
  });

  test("a signed out visitor cannot change settings", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.profiles.update, { digestHour: 3 })).rejects.toThrow();
  });
});

// The whole iMessage opt in: save a number, text the line, the page flips to verified.
describe("phone opt in", () => {
  async function withUser() {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "tenno@example.com" }));
    return { t, asUser: t.withIdentity({ subject: `${userId}|session` }) };
  }

  test("a number typed the way people type it is stored the way Photon sends it", async () => {
    const { asUser } = await withUser();
    const saved = await asUser.mutation(api.profiles.update, { phone: "(415) 555 0100" });
    expect(saved.phone).toBe("+14155550100");
  });

  test("the first inbound text verifies the phone, and says so once", async () => {
    const { t, asUser } = await withUser();
    await asUser.mutation(api.profiles.update, { phone: "(415) 555 0100" });
    expect((await asUser.query(api.profiles.me, {})).profile.phoneVerified).toBe(false);

    const first = await t.mutation(internal.profiles.linkInbound, {
      messageId: "m1",
      phone: "+14155550100",
      spaceId: "space-1",
      senderId: "+14155550100",
    });
    expect(first).toEqual({ duplicate: false, firstContact: true });
    expect((await asUser.query(api.profiles.me, {})).profile.phoneVerified).toBe(true);

    // Photon delivers at least once, a redelivery must not greet the user twice.
    const again = await t.mutation(internal.profiles.linkInbound, {
      messageId: "m1",
      phone: "+14155550100",
      spaceId: "space-1",
      senderId: "+14155550100",
    });
    expect(again.duplicate).toBe(true);
  });

  test("changing the number asks for a fresh opt in", async () => {
    const { t, asUser } = await withUser();
    await asUser.mutation(api.profiles.update, { phone: "415 555 0100" });
    await t.mutation(internal.profiles.linkInbound, {
      messageId: "m1",
      phone: "+14155550100",
      spaceId: "space-1",
      senderId: "+14155550100",
    });
    expect((await asUser.query(api.profiles.me, {})).profile.phoneVerified).toBe(true);

    await asUser.mutation(api.profiles.update, { phone: "415 555 0199" });
    expect((await asUser.query(api.profiles.me, {})).profile.phoneVerified).toBe(false);
  });
});
