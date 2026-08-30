import { v } from "convex/values";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";

const DEFAULT_TIMEZONE = "UTC";
const DEFAULT_DIGEST_HOUR = 9;

const profileFields = v.object({
  userId: v.id("users"),
  email: v.string(),
  phone: v.union(v.string(), v.null()),
  phoneVerified: v.boolean(),
  timezone: v.string(),
  digestHour: v.number(),
  platform: v.literal("pc"),
});

function shape(userId: Id<"users">, email: string, profile: Doc<"profiles"> | null) {
  return {
    userId,
    email: profile?.email ?? email,
    phone: profile?.phone ?? null,
    phoneVerified: profile?.phoneVerifiedAt !== undefined,
    timezone: profile?.timezone ?? DEFAULT_TIMEZONE,
    digestHour: profile?.digestHour ?? DEFAULT_DIGEST_HOUR,
    platform: "pc" as const,
  };
}

async function load(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

export const me = query({
  args: {},
  returns: v.object({
    user: v.object({
      _id: v.id("users"),
      name: v.union(v.string(), v.null()),
      email: v.union(v.string(), v.null()),
      image: v.union(v.string(), v.null()),
    }),
    profile: profileFields,
  }),
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const user = await ctx.db.get(userId);
    if (user === null) {
      throw new Error("User row is missing");
    }
    const profile = await load(ctx, userId);
    return {
      user: {
        _id: user._id,
        name: user.name ?? null,
        email: user.email ?? null,
        image: user.image ?? null,
      },
      // Queries cannot write, so the defaults here are saved by the first update().
      profile: shape(userId, user.email ?? "", profile),
    };
  },
});

export const update = mutation({
  args: {
    timezone: v.optional(v.string()),
    digestHour: v.optional(v.number()),
    phone: v.optional(v.union(v.string(), v.null())),
  },
  returns: profileFields,
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const user = await ctx.db.get(userId);
    if (user === null) {
      throw new Error("User row is missing");
    }
    const existing = await load(ctx, userId);
    const phoneChanged = args.phone !== undefined && args.phone !== (existing?.phone ?? null);

    const next = {
      userId,
      email: existing?.email ?? user.email ?? "",
      phone: args.phone === undefined ? existing?.phone : (args.phone ?? undefined),
      photonUserId: phoneChanged ? undefined : existing?.photonUserId,
      // A new number has to opt in again, so verification resets.
      phoneVerifiedAt: phoneChanged ? undefined : existing?.phoneVerifiedAt,
      timezone: args.timezone ?? existing?.timezone ?? DEFAULT_TIMEZONE,
      digestHour: args.digestHour ?? existing?.digestHour ?? DEFAULT_DIGEST_HOUR,
      platform: "pc" as const,
    };

    let id: Id<"profiles">;
    if (existing === null) {
      id = await ctx.db.insert("profiles", next);
    } else {
      id = existing._id;
      await ctx.db.replace(id, next);
    }

    // registerUser is an action, so a mutation has to schedule it and write the id back.
    if (phoneChanged && next.phone) {
      await ctx.scheduler.runAfter(0, internal.profiles.linkPhoton, {
        profileId: id,
        phone: next.phone,
      });
    }

    const saved = await ctx.db.get(id);
    return shape(userId, user.email ?? "", saved);
  },
});

// Convex Auth calls this the moment a user row exists, so delivery never waits on a settings save.
export const ensure = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const existing = await load(ctx, userId);
    if (existing) return null;
    const user = await ctx.db.get(userId);
    await ctx.db.insert("profiles", {
      userId,
      email: user?.email ?? "",
      timezone: DEFAULT_TIMEZONE,
      digestHour: DEFAULT_DIGEST_HOUR,
      platform: "pc" as const,
    });
    return null;
  },
});

export const storePhotonUserId = internalMutation({
  args: { profileId: v.id("profiles"), photonUserId: v.string() },
  returns: v.null(),
  handler: async (ctx, { profileId, photonUserId }) => {
    await ctx.db.patch(profileId, { photonUserId });
    return null;
  },
});

// A new phone needs a Photon user before we can text it.
export const linkPhoton = internalAction({
  args: { profileId: v.id("profiles"), phone: v.string() },
  returns: v.null(),
  handler: async (ctx, { profileId, phone }) => {
    const photonUserId = await ctx.runAction(internal.photon.registerUser, { phone });
    await ctx.runMutation(internal.profiles.storePhotonUserId, { profileId, photonUserId });
    return null;
  },
});
