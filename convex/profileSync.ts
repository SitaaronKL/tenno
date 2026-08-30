import { v } from "convex/values";
import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { requireUser } from "./lib/auth";

// DE bans IPs that poll this endpoint, so six lookups an hour per user and a six hour cache.
const CACHE_MS = 6 * 60 * 60 * 1000;
const PROFILE_URL = "https://api.warframe.com/cdn/getProfileViewingData.php";

// Cast because codegen without a deployment types components loosely.
const rateLimiterComponent = components.rateLimiter as unknown as ConstructorParameters<
  typeof RateLimiter
>[0];
const rateLimiter = new RateLimiter(rateLimiterComponent, {
  profileLookups: { kind: "fixed window", rate: 6, period: HOUR },
});

export type ParsedProfile = {
  displayName: string;
  masteryRank: number;
  nodesCompleted: number;
  xpByItem: Array<{ uniqueName: string; xp: number }>;
};

type RawEntry = { ItemType?: unknown; XP?: unknown };
type RawMission = { Tag?: unknown; Completes?: unknown };

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

// XPInfo is the mastery ledger: one entry per item the player has ever earned affinity on.
export function parseProfile(raw: unknown): ParsedProfile {
  const results = (raw as { Results?: unknown })?.Results;
  const first = (Array.isArray(results) ? results[0] : undefined) as
    | Record<string, unknown>
    | undefined;
  if (!first) {
    throw new Error("Profile has no Results, the player id is probably wrong");
  }
  const entries = Array.isArray(first.XPInfo) ? (first.XPInfo as RawEntry[]) : [];
  const byName = new Map<string, number>();
  for (const entry of entries) {
    if (typeof entry?.ItemType !== "string") continue;
    // A player can hold the same item twice, mastery counts the highest affinity.
    const xp = num(entry.XP);
    byName.set(entry.ItemType, Math.max(byName.get(entry.ItemType) ?? 0, xp));
  }
  const missions = Array.isArray(first.Missions) ? (first.Missions as RawMission[]) : [];
  const nodes = new Set<string>();
  for (const mission of missions) {
    if (typeof mission?.Tag === "string" && num(mission.Completes) > 0) nodes.add(mission.Tag);
  }
  return {
    displayName: typeof first.DisplayName === "string" ? first.DisplayName : "",
    masteryRank: num(first.PlayerLevel),
    nodesCompleted: nodes.size,
    xpByItem: [...byName].map(([uniqueName, xp]) => ({ uniqueName, xp })),
  };
}

const cacheDoc = v.object({
  playerId: v.string(),
  fetchedAt: v.number(),
  displayName: v.string(),
  masteryRank: v.number(),
  nodesCompleted: v.number(),
  xpByItem: v.array(v.object({ uniqueName: v.string(), xp: v.number() })),
});

type CacheRow = { fetchedAt: number; displayName: string; masteryRank: number } | null;

export const cached = internalQuery({
  args: { playerId: v.string() },
  returns: v.union(cacheDoc, v.null()),
  handler: async (ctx, { playerId }) => {
    const row = await ctx.db
      .query("profileCache")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .unique();
    if (!row) return null;
    const { _id, _creationTime, ...rest } = row;
    void _id;
    void _creationTime;
    return rest;
  },
});

export const store = internalMutation({
  args: {
    playerId: v.string(),
    displayName: v.string(),
    masteryRank: v.number(),
    nodesCompleted: v.number(),
    xpByItem: v.array(v.object({ uniqueName: v.string(), xp: v.number() })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = { ...args, fetchedAt: Date.now() };
    const existing = await ctx.db
      .query("profileCache")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .unique();
    if (existing) {
      await ctx.db.replace(existing._id, row);
    } else {
      await ctx.db.insert("profileCache", row);
    }
    return null;
  },
});

// Server side only. The browser never talks to api.warframe.com.
export const fetchProfile = action({
  args: { playerId: v.string() },
  returns: v.object({ cached: v.boolean(), masteryRank: v.number(), displayName: v.string() }),
  handler: async (
    ctx,
    { playerId },
  ): Promise<{ cached: boolean; masteryRank: number; displayName: string }> => {
    const { userId } = await requireUser(ctx);
    const id = playerId.trim().toLowerCase();
    if (!/^[0-9a-f]{24}$/.test(id)) {
      throw new Error("A player id is 24 hexadecimal characters");
    }
    // Asking for a profile is how a user claims it, mastery.progress reads it back from here.
    await ctx.runMutation(internal.profiles.storeMasteryPlayerId, { userId, playerId: id });
    const hit: CacheRow = await ctx.runQuery(internal.profileSync.cached, { playerId: id });
    if (hit && Date.now() - hit.fetchedAt < CACHE_MS) {
      return { cached: true, masteryRank: hit.masteryRank, displayName: hit.displayName };
    }
    await rateLimiter.limit(ctx, "profileLookups", { key: userId, throws: true });
    const res = await fetch(`${PROFILE_URL}?playerId=${id}`);
    if (res.status === 409) {
      throw new Error("DE could not find that account id");
    }
    if (!res.ok) {
      throw new Error(`DE profile lookup failed with ${res.status}`);
    }
    const parsed = parseProfile(await res.json());
    await ctx.runMutation(internal.profileSync.store, { playerId: id, ...parsed });
    return { cached: false, masteryRank: parsed.masteryRank, displayName: parsed.displayName };
  },
});
