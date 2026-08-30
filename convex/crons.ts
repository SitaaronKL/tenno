import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Upstream is CDN cached for 2 minutes, 5 is a good citizen and still fresh enough.
crons.interval("ingest", { minutes: 5 }, internal.ingest.pull.pull, { platform: "pc" });

// Slice 4 adds the hourly digest cron here.

export default crons;
