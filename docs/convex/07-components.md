# Components

Components are sandboxed "mini Convex backends" published on npm (`@convex-dev/*`). Each has its own tables and
functions; it cannot read your tables or call your functions unless you pass them in explicitly. Directory:
https://www.convex.dev/components

## Install & register
```sh
npm install @convex-dev/rate-limiter @convex-dev/resend @convex-dev/agent @convex-dev/workflow
```
```ts
// convex/convex.config.ts  (exact filename)
import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import resend from "@convex-dev/resend/convex.config.js";
import agent from "@convex-dev/agent/convex.config.js";
import workflow from "@convex-dev/workflow/convex.config.js";

const app = defineApp();
app.use(rateLimiter);
app.use(resend);
app.use(agent);
app.use(workflow);
app.use(workflow, { name: "emailWorkflows" });   // second instance with separate data
export default app;
```
After `npx convex dev`, `components` is exported from `./_generated/api`:
```ts
import { components } from "./_generated/api";
await ctx.runQuery(components.agent.threads.getThread, { threadId });   // raw component function
const rl = new RateLimiter(components.rateLimiter, {...});               // most ship a client class wrapper
```

## Semantics
- Component mutation calls join the caller's transaction: all writes commit together. If a component mutation throws,
  only *its* writes roll back and you can catch and continue.
- Calling component functions uses `ctx.runQuery/runMutation` under the hood (slight overhead); acceptable.
- Components can mount HTTP routes: `app.use(c, { httpPrefix: "/c/" })` or via helper functions in `http.ts`.
- Dashboard: component dropdown shows each component's tables/logs.
- Testing: `convex-test` → `t.registerComponent(...)` or the component's exported test helper.
- Some components require Node actions internally; that's handled inside the component.

## Commonly used official components
| Package | Use |
|---|---|
| `@convex-dev/rate-limiter` | app-level rate limits (11-component-rate-limiter.md) |
| `@convex-dev/resend` | durable email via Resend (08-component-resend.md) |
| `@convex-dev/agent` | AI agents/threads/streaming/RAG (09-component-agent.md) |
| `@convex-dev/workflow` | durable multi-step orchestration (10-component-workflow.md) |
| `@convex-dev/workpool` | bounded-parallelism queue with retries for actions/mutations |
| `@convex-dev/crons` | runtime-defined cron jobs |
| `@convex-dev/migrations` | schema backfills |
| `@convex-dev/aggregate`, `@convex-dev/sharded-counter` | O(log n) counts/sums, high-write counters |
| `@convex-dev/rag` | chunking + embeddings + vector search |
| `@convex-dev/presence`, `@convex-dev/prosemirror-sync` | realtime collab |
| `@convex-dev/stripe`, `@convex-dev/polar` | billing |
| `@convex-dev/action-cache`, `@convex-dev/persistent-text-streaming`, `@convex-dev/geospatial`, `@convex-dev/cloudflare-r2` | misc |

## Gotchas
- Import path is `.../convex.config.js` (with `.js`) — required for `moduleResolution: "Bundler"`/ESM.
- `convex.config.ts` changes require a redeploy (`npx convex dev` picks it up).
- Component functions are *not* exposed to clients; wrap them in your own `query`/`mutation` with auth checks.
- Type instantiation can get deep; add explicit return types on functions that call components to avoid
  "implicitly has type any because it references itself" circularity errors.
