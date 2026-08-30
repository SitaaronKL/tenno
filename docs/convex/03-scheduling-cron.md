# Scheduling & Cron Jobs

## Scheduled functions (`ctx.scheduler`)
Available in mutations and actions. Schedule **internal** functions only.

```ts
import { mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const sendExpiringMessage = mutation({
  args: { body: v.string() },
  handler: async (ctx, { body }) => {
    const id = await ctx.db.insert("messages", { body });
    const jobId = await ctx.scheduler.runAfter(5_000, internal.messages.destruct, { id }); // ms delay
    // or: await ctx.scheduler.runAt(Date.parse("2026-09-01T00:00Z"), internal.messages.destruct, { id });
    await ctx.db.patch("messages", id, { destructJobId: jobId }); // Id<"_scheduled_functions">
  },
});

export const destruct = internalMutation({
  args: { id: v.id("messages") },
  handler: async (ctx, { id }) => { await ctx.db.delete("messages", id); },
});

// cancel
await ctx.scheduler.cancel(jobId);
```

Semantics
- Scheduling from a mutation is transactional: if the mutation throws, nothing is scheduled. Always `await` it.
- `runAfter(0, ...)` = "run right after this transaction commits" — the standard way to trigger an action from a mutation.
- Scheduled **mutations** run exactly once (retried on internal errors); scheduled **actions** at most once.
- `cancel`: not-yet-started jobs won't run; an in-flight action finishes but its child schedules are dropped.
- Inspect: `ctx.db.system.get("_scheduled_functions", id)` → `{ name, args, scheduledTime, completedTime?, state: { kind: "pending"|"inProgress"|"success"|"failed"|"canceled" } }`.
  Results kept 7 days. Dashboard → Schedules shows queue.
- Limits: ≤1000 schedules per mutation, 4 MiB args each (16 MiB total), 1M outstanding per deployment.
- Self-rescheduling loops (`runAfter(60_000, internal.self)`) are fine for polling; prefer crons for fixed cadence.

## Cron jobs (`convex/crons.ts`)
```ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("cleanup old sessions", { minutes: 30 }, internal.sessions.cleanup, {});
crons.hourly("hourly sync", { minuteUTC: 23 }, internal.sync.run);
crons.daily("daily digest", { hourUTC: 9, minuteUTC: 17 }, internal.digest.send, { kind: "daily" });
crons.weekly("weekly report", { dayOfWeek: "monday", hourUTC: 8, minuteUTC: 5 }, internal.reports.weekly);
crons.monthly("invoice", { day: 1, hourUTC: 0, minuteUTC: 41 }, internal.billing.invoice);
crons.cron("every 5 min", "*/5 * * * *", internal.metrics.snapshot); // standard 5-field cron, UTC

export default crons;
```
- File must be `convex/crons.ts` with `export default crons`.
- `interval` accepts `{ seconds | minutes | hours }`; first run happens on deploy, then every interval.
- All times UTC. Avoid `:00` (peak load) — omit `minuteUTC` to let Convex pick, or use an odd minute.
- At most one run of a given cron executes at a time; if a run overruns, later runs are **skipped** (visible in logs).
- Dynamic/runtime-defined crons: use the `@convex-dev/crons` component.

## Durable multi-step jobs
For retries, fan-out, sleeps, and waiting on external events, use `@convex-dev/workflow` (10-component-workflow.md)
or `@convex-dev/workpool` (bounded parallelism + retries for actions).
