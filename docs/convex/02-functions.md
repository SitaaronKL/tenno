# Functions: Queries, Mutations, Actions

All backend code = functions in `convex/*.ts`, exported as `query`/`mutation`/`action` (public, in `api.*`) or
`internalQuery`/`internalMutation`/`internalAction` (private, in `internal.*`). Import constructors from
`./_generated/server`; references from `./_generated/api`.

| | Query | Mutation | Action |
|---|---|---|---|
| DB access | `ctx.db` read | `ctx.db` read+write (transaction) | none — `ctx.runQuery/runMutation` |
| Cached / reactive | yes | no | no |
| `fetch` / npm side effects | no | no | yes |
| Deterministic required | yes | yes | no |
| Timeout | 1s | 1s | 10 min (Node) / 30 min (Convex runtime) |
| Retry | safe (deterministic) | scheduled: exactly-once | none — at-most-once |

## Query
```ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const listByChannel = query({
  args: { channel: v.string(), limit: v.optional(v.number()) },
  returns: v.array(v.object({ _id: v.id("messages"), body: v.string() })), // optional
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    return await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channel", args.channel))
      .order("desc")
      .take(args.limit ?? 50);
  },
});
```
Client: `const msgs = useQuery(api.messages.listByChannel, { channel: "general" });` → `undefined` while loading.
A query returning `undefined` arrives as `null`. Pass `"skip"` as args to skip: `useQuery(api.x.y, cond ? {..} : "skip")`.

## Mutation
```ts
export const send = mutation({
  args: { channel: v.string(), body: v.string() },
  handler: async (ctx, { channel, body }) => {
    const userId = /* getAuthUserId(ctx) */ null;
    const id = await ctx.db.insert("messages", { channel, body, userId, kind: "text" });
    await ctx.scheduler.runAfter(0, internal.ai.moderate, { id }); // kick off side effects
    return id;
  },
});
```
Client: `const send = useMutation(api.messages.send); await send({ channel, body });`
Optimistic: `useMutation(api.x).withOptimisticUpdate((localStore, args) => { ... localStore.setQuery(...) })`.
Mutations are serializable transactions: reads are consistent, all writes commit or none. Throwing rolls back.

## Action
```ts
"use node"; // ONLY if you need Node-only npm packages; otherwise omit (faster cold start, fetch available)
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const summarize = internalAction({
  args: { id: v.id("messages") },
  handler: async (ctx, { id }) => {
    const msg = await ctx.runQuery(internal.messages.get, { id });
    const res = await fetch("https://api.example.com", { method: "POST", body: JSON.stringify(msg) });
    const { summary } = await res.json();
    await ctx.runMutation(internal.messages.setSummary, { id, summary });
  },
});
```
- `"use node"` must be the first line of the file; a Node file can only export actions.
- Each `ctx.runQuery/runMutation` in an action is its own transaction — batch related reads into one query.
- Preferred pattern: client calls a **mutation** that writes + `ctx.scheduler.runAfter(0, internal.x.action)`;
  avoid calling actions directly from the client (`useAction`) unless you need the return value.
- Actions aren't retried automatically. Use the Workpool/Workflow components for retries.
- Vector search: `await ctx.vectorSearch("foods", "by_embedding", { vector, limit: 16, filter: q => q.eq("cuisine","French") })`
  returns `{ _id, _score }[]`; then `ctx.runQuery` to load docs.

## Internal functions
```ts
export const markPro = internalMutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => ctx.db.patch("plans", planId, { planType: "professional" }),
});
// call: await ctx.runMutation(internal.plans.markPro, { planId });
```
Use `internal.*` for anything scheduled, cron'd, or called by actions/HTTP actions. Run from CLI: `npx convex run plans:markPro '{"planId":"..."}'`.

## Reading data (`ctx.db`)
```ts
await ctx.db.get("tasks", id);                 // doc | null (pass table name; needed for future features)
ctx.db.query("tasks")                          // full scan unless withIndex/withSearchIndex
  .withIndex("by_user", q => q.eq("userId", u).gt("_creationTime", t0))
  .order("asc" | "desc")
  .filter(q => q.eq(q.field("done"), false))   // post-index filter — avoid on big sets
  .collect() | .take(n) | .first() | .unique() | .paginate(opts)
for await (const doc of ctx.db.query("tasks")) { ... }   // async iteration
await ctx.db.system.get("_scheduled_functions", id);       // system tables
```
`.unique()` throws if >1 match. Transaction limits: 16 MiB read, 32k docs scanned.

## Writing data
```ts
const id = await ctx.db.insert("tasks", { text });
await ctx.db.patch("tasks", id, { done: true, tag: undefined }); // shallow merge; undefined removes a field
await ctx.db.replace("tasks", id, { text: "new" });             // whole doc (system fields preserved)
await ctx.db.delete("tasks", id);
```
Limits per transaction: 16k docs written, 16 MiB. Check budget with `await ctx.meta.getTransactionMetrics()`.

## Pagination
```ts
import { paginationOptsValidator } from "convex/server";
export const list = query({
  args: { channel: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) =>
    ctx.db.query("messages").withIndex("by_channel", q => q.eq("channel", args.channel))
      .order("desc").paginate(args.paginationOpts), // { page, isDone, continueCursor }
});
// client
const { results, status, loadMore } = usePaginatedQuery(api.messages.list, { channel }, { initialNumItems: 20 });
// status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted"; loadMore(20)
```
Pages are reactive and may shrink/grow. Only one `.paginate` per query function.

## Error handling
```ts
import { ConvexError } from "convex/values";
throw new ConvexError({ code: "NOT_FOUND", message: "No such task" }); // data is any Convex value
// client
try { await send(args) } catch (e) {
  if (e instanceof ConvexError) console.log((e.data as { code: string }).code);
}
```
Plain `Error` messages are redacted to "Server Error" in production; `ConvexError.data` is delivered to clients.
Query errors surface via React error boundaries.

## Validation notes
- Always give public functions `args` validators (`require-argument-validators` lint rule). Extra keys are rejected.
- `returns` validator is optional but strips/validates output and improves types.
- Use `v.id("table")` not `v.string()` for IDs, so users can't pass IDs from other tables.

## Helper-function pattern
Keep `query/mutation` wrappers thin; put logic in plain functions taking `QueryCtx`/`MutationCtx`/`ActionCtx`
(types from `./_generated/server`) in e.g. `convex/model/*.ts`. Consider `customQuery`/`customMutation` from
`convex-helpers/server/customFunctions` to inject auth.
