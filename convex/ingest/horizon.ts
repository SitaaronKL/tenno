import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { scheduleHorizons } from "./schedules";

const WARN_BEFORE_MS = 7 * 86_400_000;

// The incursion and arbitration schedules are checked in, not fetched, so they run out. A week of
// notice is enough to run scripts/refresh-schedules.mjs before either panel goes blank.
export const check = internalMutation({
  args: { now: v.optional(v.number()) },
  returns: v.array(v.object({ schedule: v.string(), endsAt: v.number() })),
  handler: async (ctx, { now = Date.now() }) => {
    const due = Object.entries(scheduleHorizons())
      .filter(([, endsAt]) => endsAt - now < WARN_BEFORE_MS)
      .map(([schedule, endsAt]) => ({ schedule, endsAt }));
    for (const { schedule, endsAt } of due) {
      console.warn(
        `${schedule} schedule ends ${new Date(endsAt).toISOString()}, ` +
          "run node scripts/refresh-schedules.mjs",
      );
    }
    return due;
  },
});
