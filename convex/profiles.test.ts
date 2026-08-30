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

describe("one phone, one account", () => {
  async function twoUsers() {
    const t = convexTest(schema, modules);
    const [a, b] = await t.run(async (ctx) => [
      await ctx.db.insert("users", { email: "a@example.com" }),
      await ctx.db.insert("users", { email: "b@example.com" }),
    ]);
    return {
      t,
      alice: t.withIdentity({ subject: `${a}|session` }),
      bob: t.withIdentity({ subject: `${b}|session` }),
    };
  }

  test("a number already claimed by somebody else is refused with a reason", async () => {
    const { alice, bob } = await twoUsers();
    await alice.mutation(api.profiles.update, { phone: "+15550001234" });

    await expect(bob.mutation(api.profiles.update, { phone: "+1 (555) 000-1234" })).rejects.toThrow(
      /already linked to another account/,
    );
  });

  test("saving your own number again is fine", async () => {
    const { alice } = await twoUsers();
    await alice.mutation(api.profiles.update, { phone: "+15550001234" });
    const saved = await alice.mutation(api.profiles.update, { phone: "+15550001234" });
    expect(saved.phone).toBe("+15550001234");
  });

  test("an inbound text reaches exactly the account that saved the number", async () => {
    const { t, alice } = await twoUsers();
    await alice.mutation(api.profiles.update, { phone: "5550001234" });
    await t.mutation(internal.profiles.linkInbound, {
      messageId: "m1",
      phone: "+15550001234",
      spaceId: "space-1",
      senderId: "+15550001234",
    });

    const owner = await t.query(internal.profiles.userForVerifiedPhone, { phone: "+15550001234" });
    const aliceProfile = await t.run(async (ctx) =>
      (await ctx.db.query("profiles").collect()).find((p) => p.email === "a@example.com"),
    );
    expect(owner).toBe(aliceProfile!.userId);
  });
});

describe("settings a client cannot save", () => {
  async function signedInUser() {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "tenno@example.com" }),
    );
    return t.withIdentity({ subject: `${userId}|session` });
  }

  test("a digest hour outside the clock is refused, the digest would never fire", async () => {
    const t = await signedInUser();
    await expect(t.mutation(api.profiles.update, { digestHour: 99 })).rejects.toThrow(/0 and 23/);
    await expect(t.mutation(api.profiles.update, { digestHour: -1 })).rejects.toThrow(/0 and 23/);
    await expect(t.mutation(api.profiles.update, { digestHour: 9.5 })).rejects.toThrow(/0 and 23/);
  });

  test("a timezone nobody lives in is refused rather than silently becoming UTC", async () => {
    const t = await signedInUser();
    await expect(
      t.mutation(api.profiles.update, { timezone: "Mars/Olympus" }),
    ).rejects.toThrow(/timezone/i);
  });

  test("a real hour and a real timezone save", async () => {
    const t = await signedInUser();
    const saved = await t.mutation(api.profiles.update, {
      digestHour: 0,
      timezone: "America/New_York",
    });
    expect(saved.digestHour).toBe(0);
    expect(saved.timezone).toBe("America/New_York");
  });
});

describe("hidden world state pieces", () => {
  test("a saved choice comes back on the next read", async () => {
    const asUser = await signedIn();
    await asUser.mutation(api.profiles.update, { hidden: ["box.nightwave", "board.vox"] });
    const me = await asUser.query(api.profiles.me, {});
    expect(me.profile.hidden).toEqual(["box.nightwave", "board.vox"]);
  });

  test("a new user hides nothing", async () => {
    const asUser = await signedIn();
    const me = await asUser.query(api.profiles.me, {});
    expect(me.profile.hidden).toEqual([]);
  });

  test("a key neither side knows is refused", async () => {
    const asUser = await signedIn();
    await expect(
      asUser.mutation(api.profiles.update, { hidden: ["box.nightwave", "box.mars"] }),
    ).rejects.toThrow(/box.mars/);
  });

  test("saving another setting leaves the choice alone", async () => {
    const asUser = await signedIn();
    await asUser.mutation(api.profiles.update, { hidden: ["tile.baro"] });
    await asUser.mutation(api.profiles.update, { digestHour: 4 });
    const me = await asUser.query(api.profiles.me, {});
    expect(me.profile.hidden).toEqual(["tile.baro"]);
  });
});
