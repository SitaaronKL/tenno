import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function signedIn() {
  const t = convexTest(schema, modules);
  const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "tenno@example.com" }));
  return t.withIdentity({ subject: `${userId}|session` });
}

describe("profiles", () => {
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
