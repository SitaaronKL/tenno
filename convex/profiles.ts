import { ConvexError, v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { isHiddenKey } from "../lib/contracts/preferences";
import { requireUser } from "./lib/auth";
import { normalizePhone } from "./lib/phone";

// Photon always sends E.164, so a number typed without a country code would never match its sender.
function toE164(raw: string): string {
  const key = normalizePhone(raw);
  if (key === "" || raw.trim().startsWith("+")) return key;
  const digits = key.slice(1);
  // The Photon line is a US number, so a bare ten digits is a US number too.
  return digits.length === 10 ? `+1${digits}` : key;
}

// A zone the runtime does not know silently becomes UTC, so a typo would move somebody's digest.
function knownTimezone(zone: string): boolean {
  const supported = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  const zones = supported.supportedValuesOf?.("timeZone");
  if (zones) return zones.includes(zone);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

const DEFAULT_TIMEZONE = "UTC";
const DEFAULT_DIGEST_HOUR = 9;

const profileFields = v.object({
  userId: v.id("users"),
  email: v.string(),
  phone: v.union(v.string(), v.null()),
  phoneVerified: v.boolean(),
  timezone: v.string(),
  digestHour: v.number(),
  hidden: v.array(v.string()),
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
    hidden: profile?.hidden ?? [],
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
    hidden: v.optional(v.array(v.string())),
  },
  returns: profileFields,
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const user = await ctx.db.get(userId);
    if (user === null) {
      throw new Error("User row is missing");
    }
    if (
      args.digestHour !== undefined &&
      (!Number.isInteger(args.digestHour) || args.digestHour < 0 || args.digestHour > 23)
    ) {
      throw new ConvexError("Pick a digest hour between 0 and 23.");
    }
    if (args.timezone !== undefined && !knownTimezone(args.timezone)) {
      throw new ConvexError(`${args.timezone} is not a timezone this deployment knows.`);
    }
    // A key the UI does not draw would hide nothing and outlive whoever typed it.
    for (const key of args.hidden ?? []) {
      if (!isHiddenKey(key)) {
        throw new ConvexError(`${key} is not something Voidwatch can hide.`);
      }
    }
    const existing = await load(ctx, userId);
    const nextPhone = args.phone === undefined ? undefined : args.phone === null ? null : toE164(args.phone);
    const phoneChanged = nextPhone !== undefined && nextPhone !== (existing?.phone ?? null);

    // A number is one person's identity over iMessage, two profiles on it would race for inbound texts.
    if (phoneChanged && nextPhone) {
      const claimed = await ctx.db
        .query("profiles")
        .withIndex("by_phone", (q) => q.eq("phone", nextPhone))
        .first();
      if (claimed && claimed.userId !== userId) {
        throw new ConvexError("That number is already linked to another account.");
      }
    }

    const next = {
      userId,
      email: existing?.email ?? user.email ?? "",
      phone:
        args.phone === undefined
          ? existing?.phone
          : args.phone === null
            ? undefined
            : toE164(args.phone) || undefined,
      photonUserId: phoneChanged ? undefined : existing?.photonUserId,
      photonSpaceId: phoneChanged ? undefined : existing?.photonSpaceId,
      lastDigestAt: existing?.lastDigestAt,
      // A new number has to opt in again, so verification resets.
      phoneVerifiedAt: phoneChanged ? undefined : existing?.phoneVerifiedAt,
      hidden: args.hidden ?? existing?.hidden,
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

// The inbound conversation, so an outbound alert lands in the thread the user opted in through.
export const photonSpace = internalQuery({
  args: { phone: v.string() },
  returns: v.union(
    v.object({ profileId: v.id("profiles"), spaceId: v.union(v.string(), v.null()) }),
    v.null(),
  ),
  handler: async (ctx, { phone }) => {
    const key = toE164(phone);
    if (!key) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_phone", (q) => q.eq("phone", key))
      .first();
    if (!profile) return null;
    return { profileId: profile._id, spaceId: profile.photonSpaceId ?? null };
  },
});

export const storePhotonSpaceId = internalMutation({
  args: { profileId: v.id("profiles"), spaceId: v.string() },
  returns: v.null(),
  handler: async (ctx, { profileId, spaceId }) => {
    await ctx.db.patch(profileId, { photonSpaceId: spaceId });
    return null;
  },
});

// Syncing a Warframe account is what claims it, mastery reads only ever go through this.
export const storeMasteryPlayerId = internalMutation({
  args: { userId: v.id("users"), playerId: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, playerId }) => {
    const profile = await load(ctx, userId);
    if (profile) await ctx.db.patch(profile._id, { masteryPlayerId: playerId });
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

// The iMessage surface has no session, a verified phone is the only identity it has.
export const userForVerifiedPhone = internalQuery({
  args: { phone: v.string() },
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx, { phone }) => {
    const key = toE164(phone);
    if (!key) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_phone", (q) => q.eq("phone", key))
      .first();
    if (!profile || profile.phoneVerifiedAt === undefined) return null;
    return profile.userId;
  },
});

// The inbound text is the opt in: it links the sender to a profile and verifies the phone.
export const linkInbound = internalMutation({
  args: {
    messageId: v.string(),
    phone: v.string(),
    spaceId: v.string(),
    senderId: v.string(),
  },
  returns: v.object({ duplicate: v.boolean(), firstContact: v.boolean() }),
  handler: async (ctx, { messageId, phone, spaceId, senderId }) => {
    const seen = await ctx.db
      .query("photonInbound")
      .withIndex("by_message", (q) => q.eq("messageId", messageId))
      .first();
    // Photon delivers at least once, so the same message id is answered once.
    if (seen) return { duplicate: true, firstContact: false };
    await ctx.db.insert("photonInbound", { messageId, receivedAt: Date.now() });

    const key = toE164(phone);
    const profile = key
      ? await ctx.db
          .query("profiles")
          .withIndex("by_phone", (q) => q.eq("phone", key))
          .first()
      : null;
    if (!profile) return { duplicate: false, firstContact: false };

    const firstContact = profile.phoneVerifiedAt === undefined;
    await ctx.db.patch(profile._id, {
      photonSpaceId: spaceId,
      // A sender id that is not a phone number is the Photon user id for this line.
      photonUserId: toE164(senderId) === key ? profile.photonUserId : senderId,
      phoneVerifiedAt: profile.phoneVerifiedAt ?? Date.now(),
    });
    return { duplicate: false, firstContact };
  },
});

// A new phone needs a Photon user before we can text it.
export const linkPhoton = internalAction({
  args: { profileId: v.id("profiles"), phone: v.string() },
  returns: v.null(),
  handler: async (ctx, { profileId, phone }) => {
    try {
      const photonUserId = await ctx.runAction(internal.photon.registerUser, { phone });
      await ctx.runMutation(internal.profiles.storePhotonUserId, { profileId, photonUserId });
    } catch (error) {
      // The inbound text is what verifies a phone, so a registration hiccup must not block the opt in.
      console.error("Photon registration failed", error);
    }
    return null;
  },
});
