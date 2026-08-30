import { v } from "convex/values";
import { query } from "./_generated/server";

// Public and unauthenticated: world state is the same for everyone, the landing page reads it too.
export const get = query({
  args: { platform: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("worldState")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .unique();
    return row ? row.data : null;
  },
});
