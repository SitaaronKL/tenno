import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { parseProfile } from "./profileSync";
import { api } from "./_generated/api";
import schema from "./schema";
import fixture from "./gamedata/profile-fixture.json";

const modules = import.meta.glob("./**/*.ts");

describe("parseProfile", () => {
  it("reads the rank, the nodes run and the mastery ledger from a saved profile", () => {
    const parsed = parseProfile(fixture);

    expect(parsed.displayName).toBe("TennoTester");
    expect(parsed.masteryRank).toBe(27);
    expect(parsed.nodesCompleted).toBe(2);

    const xp = new Map(parsed.xpByItem.map((entry) => [entry.uniqueName, entry.xp]));
    expect(xp.get("/Lotus/Powersuits/Excalibur/Excalibur")).toBe(6000);
    // The same weapon appears twice, the higher affinity is the one that counts.
    expect(xp.get("/Lotus/Weapons/Tenno/Rifle/Rifle")).toBe(3000);
    expect(xp.get("/Lotus/Weapons/Tenno/Pistol/Lato")).toBe(1200);
  });

  it("refuses a body with no Results, which is what DE returns for a bad id", () => {
    expect(() => parseProfile({})).toThrow();
  });
});

// The parser above is pure. These drive the real public action: auth, the cache, and the limiter.
describe("fetchProfile, the action the Mastery page calls", () => {
  const PLAYER = "a".repeat(24);

  function respond(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status });
  }

  async function signedIn(t: ReturnType<typeof convexTest>, email: string) {
    const userId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", { email });
      await ctx.db.insert("profiles", {
        userId: id,
        email,
        timezone: "UTC",
        digestHour: 9,
        platform: "pc" as const,
      });
      return id;
    });
    return t.withIdentity({ subject: `${userId}|session` });
  }

  function setup() {
    const t = convexTest(schema, modules);
    rateLimiter.register(t);
    return t;
  }

  afterEach(() => vi.unstubAllGlobals());

  it("refuses a signed out visitor", async () => {
    const t = setup();
    vi.stubGlobal("fetch", () => Promise.resolve(respond(fixture)));
    await expect(t.action(api.profileSync.fetchProfile, { playerId: PLAYER })).rejects.toThrow();
  });

  it("refuses something that is not a player id before it ever calls DE", async () => {
    const t = setup();
    const called = vi.fn(() => Promise.resolve(respond(fixture)));
    vi.stubGlobal("fetch", called);
    const user = await signedIn(t, "a@example.com");

    await expect(
      user.action(api.profileSync.fetchProfile, { playerId: "not-a-player" }),
    ).rejects.toThrow(/24 hexadecimal/);
    expect(called).not.toHaveBeenCalled();
  });

  it("says so plainly when DE does not know the account", async () => {
    const t = setup();
    vi.stubGlobal("fetch", () => Promise.resolve(respond({}, 409)));
    const user = await signedIn(t, "a@example.com");

    await expect(
      user.action(api.profileSync.fetchProfile, { playerId: PLAYER }),
    ).rejects.toThrow(/could not find/i);
  });

  it("serves the second look up from cache, DE is only asked once", async () => {
    const t = setup();
    const called = vi.fn(() => Promise.resolve(respond(fixture)));
    vi.stubGlobal("fetch", called);
    const user = await signedIn(t, "a@example.com");

    const first = await user.action(api.profileSync.fetchProfile, { playerId: PLAYER });
    const second = await user.action(api.profileSync.fetchProfile, { playerId: PLAYER });

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.displayName).toBe("TennoTester");
    expect(called).toHaveBeenCalledTimes(1);
  });

  it("syncing claims the account, so the Mastery page reads it back", async () => {
    const t = setup();
    vi.stubGlobal("fetch", () => Promise.resolve(respond(fixture)));
    const user = await signedIn(t, "a@example.com");

    await user.action(api.profileSync.fetchProfile, { playerId: PLAYER });

    const progress = await user.query(api.mastery.progress, {});
    expect(progress.playerId).toBe(PLAYER);
    expect(progress.profile!.masteryRank).toBe(27);
  });

  it("holds one account to six DE look ups an hour", async () => {
    const t = setup();
    vi.stubGlobal("fetch", () => Promise.resolve(respond(fixture)));
    const user = await signedIn(t, "a@example.com");

    // Distinct ids, so the six hour cache never answers instead of DE.
    for (let i = 0; i < 6; i++) {
      await user.action(api.profileSync.fetchProfile, {
        playerId: i.toString(16).padStart(24, "0"),
      });
    }
    await expect(
      user.action(api.profileSync.fetchProfile, { playerId: "f".repeat(24) }),
    ).rejects.toThrow();
  });
});
