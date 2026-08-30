import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import type { Fissure, WorldState } from "../lib/contracts/worldstate";

const modules = import.meta.glob("./**/*.ts");

function fissure(key: string, expiresAt: number, tier: Fissure["tier"] = "Axi") {
  return {
    key,
    node: "Ani (Void)",
    missionType: "Survival",
    enemy: "Corrupted",
    tier,
    steelPath: false,
    storm: false,
    startsAt: expiresAt - 3_600_000,
    expiresAt,
  };
}

function snapshot(now: number): WorldState {
  return {
    platform: "pc",
    fetchedAt: now,
    upstreamTimestamp: now,
    stale: false,
    fissures: [fissure("open", now + 600_000), fissure("gone", now - 600_000)],
    alerts: [],
    invasions: [],
    sortie: null,
    archonHunt: null,
    baro: null,
    nightwave: null,
    cycles: [],
  };
}

describe("worldstate.get", () => {
  test("a visitor sees nothing before the first pull", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.worldstate.get, { platform: "pc" })).resolves.toBe(null);
  });

  test("a stale snapshot still shows the fissures that are open right now", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    // Upstream lagged half an hour, the fissures it listed are still stored.
    const lagged = {
      ...snapshot(now),
      fetchedAt: now - 30 * 60_000,
      upstreamTimestamp: now - 30 * 60_000,
      stale: true,
    };
    await t.mutation(internal.ingest.apply.apply, { platform: "pc", state: lagged });
    await t.mutation(internal.ingest.prune.prune, { platform: "pc", now });

    const state = (await t.query(api.worldstate.get, { platform: "pc" }))!;
    expect(state.fissures.map((f) => f.key)).toEqual(["open"]);
    expect(state.stale).toBe(true);
  });

  test("fissures read Lith first and Omnia last, soonest to expire inside a tier", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    await t.mutation(internal.ingest.apply.apply, {
      platform: "pc",
      state: {
        ...snapshot(now),
        fissures: [
          fissure("omnia", now + 900_000, "Omnia"),
          fissure("axi late", now + 900_000, "Axi"),
          fissure("lith", now + 600_000, "Lith"),
          fissure("axi soon", now + 300_000, "Axi"),
          fissure("meso", now + 600_000, "Meso"),
          fissure("requiem", now + 600_000, "Requiem"),
          fissure("neo", now + 600_000, "Neo"),
        ],
      },
    });

    const state = (await t.query(api.worldstate.get, { platform: "pc" }))!;
    expect(state.fissures.map((f) => f.key)).toEqual([
      "lith",
      "meso",
      "neo",
      "axi soon",
      "axi late",
      "requiem",
      "omnia",
    ]);
  });

  test("a snapshot stored before bounties existed still opens the dashboard", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    // A row written by an older deploy, no bounties key at all.
    await t.run(async (ctx) => {
      await ctx.db.insert("worldState", { platform: "pc", fetchedAt: now, data: snapshot(now) });
    });

    const state = (await t.query(api.worldstate.get, { platform: "pc" }))!;
    expect(state.fissures.map((f) => f.key)).toContain("open");
    // The board reads it as empty rather than breaking, the way components/panels/bounties.tsx does.
    expect(state.bounties ?? []).toEqual([]);
  });
});
