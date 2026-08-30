import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { WorldState } from "../lib/contracts/worldstate";

const modules = import.meta.glob("./**/*.ts");

function fissure(key: string, expiresAt: number) {
  return {
    key,
    node: "Ani (Void)",
    missionType: "Survival",
    enemy: "Corrupted",
    tier: "Axi" as const,
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
    await t.run(async (ctx) => {
      await ctx.db.insert("worldState", {
        platform: "pc",
        fetchedAt: now - 30 * 60_000,
        // Upstream lagged half an hour, the fissures it listed are still stored.
        data: { ...snapshot(now), fetchedAt: now - 30 * 60_000, upstreamTimestamp: now - 30 * 60_000, stale: true },
      });
    });

    const state = (await t.query(api.worldstate.get, { platform: "pc" }))!;
    expect(state.fissures.map((f) => f.key)).toEqual(["open"]);
    expect(state.stale).toBe(true);
  });
});
