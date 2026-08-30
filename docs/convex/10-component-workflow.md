# `@convex-dev/workflow` (0.4.6)

Durable functions: a `handler(step, args)` that orchestrates queries/mutations/actions as **steps**, journaled so it
survives restarts, sleeps for days at no cost, retries actions, waits on external events. Built on Workpool.

## Setup
```ts
// convex/convex.config.ts
import workflow from "@convex-dev/workflow/convex.config.js";
app.use(workflow);

// convex/workflow.ts
import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "./_generated/api";
export const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    defaultRetryBehavior: { maxAttempts: 3, initialBackoffMs: 100, base: 2 },
    retryActionsByDefault: true,
    maxParallelism: 10,
  },
});
```

## Define
```ts
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { workflow } from "./workflow";

export const onboarding = workflow.define({
  args: { userId: v.id("users") },
  returns: v.string(),
  handler: async (step, { userId }): Promise<string> => {   // explicit return type avoids TS circularity
    const user = await step.runQuery(internal.users.get, { userId });
    const content = await step.runAction(internal.llm.personalize, { userId }, { retry: true, name: "personalize" });
    await step.runMutation(internal.emails.sendWelcome, { userId, content });

    await step.awaitEvent({ name: "emailVerified" });       // pause until sendEvent(...)
    await step.sleep(3 * 24 * 60 * 60 * 1000);              // 3 days, no resources consumed
    await step.runMutation(internal.emails.sendFollowUp, { userId }, { runAfter: 60_000 }); // or runAt

    const [a, b] = await Promise.all([                       // parallel steps (bounded by maxParallelism)
      step.runAction(internal.x.a, {}), step.runAction(internal.x.b, {}),
    ]);
    const child = await step.runWorkflow(internal.flows.child, { userId }); // nested workflow
    return `${user.name}:${a}${b}${child}`;
  },
});
```
Step options: `{ retry: true | false | { maxAttempts, initialBackoffMs, base } }`, `{ runAfter | runAt }`,
`{ name }`, `{ inline: true }` (mutation shares the workflow's transaction), `{ unstableArgs: true }` (skip
determinism check on args). `step.withOptions({...})` returns a step with defaults.

## Start / observe / control
```ts
import { start, getStatus, cancel, cleanup, restart, sendEvent, list, listSteps, vWorkflowId, vResultValidator } from "@convex-dev/workflow";

export const kickoff = mutation({
  handler: async (ctx) => start(ctx, internal.flows.onboarding, { userId }, {
    onComplete: internal.flows.done,
    context: { userId },     // passed through to onComplete
  }),
});
export const done = internalMutation({
  args: { workflowId: vWorkflowId, result: vResultValidator, context: v.any() },
  handler: async (ctx, { workflowId, result }) => {
    if (result.kind === "success") console.log(result.returnValue);
    else if (result.kind === "error") console.error(result.error);
    else /* "canceled" */ ;
    await cleanup(ctx, components.workflow, workflowId);   // delete journal when done
  },
});

await getStatus(ctx, components.workflow, workflowId);   // reactive-friendly in a query
await cancel(ctx, components.workflow, workflowId);
await restart(ctx, components.workflow, workflowId, { from: 2 });          // or { from: "eventName" } / { startAsync: true }
await sendEvent(ctx, components.workflow, { name: "emailVerified", workflowId, value: 42 }); // or { error }
await list(ctx, components.workflow, { order: "desc" }); await listSteps(ctx, components.workflow, workflowId);
```
Typed events: `const approval = defineEvent({ name: "approval", validator: v.object({ approved: v.boolean() }) });`
then `await step.awaitEvent(approval)` / `sendEvent(ctx, components.workflow, { ...approval, workflowId, value })`.
Dynamic events: `createEvent(ctx, components.workflow, { name, workflowId })` → `step.awaitEvent({ id })`.
Legacy API `workflow.start/status/cancel/cleanup` methods on the manager also exist.

## Rules & limits
- The handler must be **deterministic**: no `fetch`, `Date.now()` (use a step), `crypto`, `ctx.db`; `Math.random`
  is seeded per workflow. Everything with side effects goes in a step.
- Changing step order/count of an in-flight workflow → determinism violation; deploy new logic as a new workflow
  or drain old ones first.
- Total step args+returns ≤ 1 MiB per workflow run; journal ≤ 8 MiB. Keep big data in tables and pass IDs.
- Steps run at-least-once semantics when retried — make actions idempotent.
- CLI: `npx convex run --component workflow utils:updateConfig '{ "maxParallelism": 50 }'`.
