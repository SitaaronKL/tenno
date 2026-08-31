import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Upstream is CDN cached for 2 minutes, 5 is a good citizen and still fresh enough.
crons.interval("ingest", { minutes: 5 }, internal.ingest.pull.pull, { platform: "pc" });

// Digest mode rules batch into one message per user per hour.
crons.hourly("digest", { minuteUTC: 0 }, internal.notify.digest, {});

// The daily and weekly resets are a clock, not a feed, so they are generated here.
crons.hourly("resets", { minuteUTC: 0 }, internal.resets.tick, {});

// The checked in incursion and arbitration schedules run out, this warns a week before they do.
crons.daily("schedule horizon", { hourUTC: 5, minuteUTC: 0 }, internal.ingest.horizon.check, {});

// worldEvents and photonInbound are append only and check offs outlive their rotation,
// this is what keeps all three bounded.
crons.weekly("retention", { dayOfWeek: "sunday", hourUTC: 4, minuteUTC: 0 }, internal.retention.sweep, {});

export default crons;
