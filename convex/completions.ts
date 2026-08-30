import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";

// A guest is a real signed in user to Convex Auth, but its account dies with the browser,
// so a tick saved on it would quietly vanish. Check offs need an account that comes back.
async function isGuest(ctx: QueryCtx, userId: Id<"users">): Promise<boolean> {
  const user = await ctx.db.get(userId);
  return user?.isAnonymous === true;
}

export const list = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    if (await isGuest(ctx, userId)) return [];
    const now = Date.now();
    const rows = await ctx.db
      .query("completions")
      .withIndex("by_user_key", (q) => q.eq("userId", userId))
      .collect();
    // A row whose rotation ended is dead weight until retention sweeps it, so it is not listed.
    return rows.filter((r) => r.expiresAt > now).map((r) => r.key);
  },
});

// The boxes show for everyone, this says whether a click here saves or asks for a real account.
export const canSave = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    return !(await isGuest(ctx, userId));
  },
});

export const toggle = mutation({
  args: { key: v.string(), expiresAt: v.number() },
  // True when the task is now ticked off.
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    if (await isGuest(ctx, userId)) throw new ConvexError("Sign in to save this");

    const existing = await ctx.db
      .query("completions")
      .withIndex("by_user_key", (q) => q.eq("userId", userId).eq("key", args.key))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await ctx.db.insert("completions", {
      userId,
      key: args.key,
      expiresAt: args.expiresAt,
      doneAt: Date.now(),
    });
    return true;
  },
});
