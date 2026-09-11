import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// Photon cools recipients who go quiet. Two days of silence earns one gentle text, and one
// nudge holds for three days so a user who never answers is not pestered daily.
const QUIET_AFTER = 2 * 86_400_000;
const NUDGE_HOLD = 3 * 86_400_000;

// The Cephalon's own voice, not a system notice.
const NUDGE_TEXT =
  "yo, the line mutes me if you go quiet for too long, send anything back and your alerts keep landing";

export const candidates = internalQuery({
  args: { now: v.number() },
  returns: v.array(v.object({ profileId: v.id("profiles"), phone: v.string() })),
  handler: async (ctx, { now }) => {
    // Profiles stay few until launch, a full read here is cheaper than a new index.
    const profiles = await ctx.db.query("profiles").collect();
    const out: { profileId: (typeof profiles)[number]["_id"]; phone: string }[] = [];
    for (const profile of profiles) {
      if (!profile.phone || profile.phoneVerifiedAt === undefined) continue;
      const lastHeard = profile.lastInboundAt ?? profile.phoneVerifiedAt;
      if (now - lastHeard < QUIET_AFTER) continue;
      if (profile.lastNudgeAt !== undefined && now - profile.lastNudgeAt < NUDGE_HOLD) continue;
      // Only someone the line actually texts needs it kept warm.
      const rules = await ctx.db
        .query("rules")
        .withIndex("by_user", (q) => q.eq("userId", profile.userId))
        .collect();
      if (!rules.some((rule) => rule.enabled && rule.channels.includes("imessage"))) continue;
      out.push({ profileId: profile._id, phone: profile.phone });
    }
    return out;
  },
});

export const markNudged = internalMutation({
  args: { profileId: v.id("profiles"), at: v.number() },
  returns: v.null(),
  handler: async (ctx, { profileId, at }) => {
    await ctx.db.patch(profileId, { lastNudgeAt: at });
    return null;
  },
});

export const run = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const quiet = await ctx.runQuery(internal.nudge.candidates, { now });
    for (const { profileId, phone } of quiet) {
      // Marked first, so a Photon failure does not retry into its own daily cap tomorrow anyway.
      await ctx.runMutation(internal.nudge.markNudged, { profileId, at: now });
      try {
        await ctx.runAction(internal.photon.sendText, { phone, text: NUDGE_TEXT });
      } catch {
        // A cooling refusal here means the cap is already spent, the next sweep tries again.
      }
    }
    return null;
  },
});
