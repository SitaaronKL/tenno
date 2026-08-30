# Best Practices & Limits

Source: https://docs.convex.dev/understanding/best-practices (+ Zen of Convex). ESLint: `@convex-dev/eslint-plugin`.

## The rules
1. **Await every promise** (`no-floating-promises`). Unawaited `ctx.scheduler.runAfter`/`ctx.db.patch` may silently
   not happen; dangling promises in actions can fail on the next invocation.
2. **Index, don't `.filter()`.** `.withIndex` / `.withSearchIndex` narrow at the storage layer; `.filter()` and JS
   filtering still read every row. OK only for genuinely small sets.
3. **`.collect()` only for small results** (< ~1000 docs). Otherwise narrow via index, `.take(n)`, paginate,
   denormalize, or use Aggregate/Sharded Counter components.
4. **Prune redundant indexes.** `by_a` is covered by `by_a_and_b` (query with just `q.eq("a", x)`).
5. **Argument validators on all public functions.** Use `v.id("table")` for IDs. Consider `returns` validators.
6. **Access control in every public function.** `ctx.auth.getUserIdentity()` / `getAuthUserId(ctx)`; never trust
   a user-supplied `userId`/email arg for authorization. Prefer narrow mutations (`setTeamOwner`) over generic
   `update(anything)`.
7. **Schedule and cron only `internal.*` functions.** Anything in `api.*` is callable by anyone.
8. **Thin wrappers, fat helpers.** Put logic in plain functions over `QueryCtx`/`MutationCtx` (`convex/model/`);
   `query({ handler: (ctx, a) => Model.doThing(ctx, a) })`. Or use `customQuery/customMutation` from
   `convex-helpers` to inject auth/user.
9. **`ctx.runAction` only to cross runtimes** (Convex → Node). Otherwise call a helper function directly.
10. **Avoid sequential `ctx.runQuery/runMutation` in actions** — each is a separate transaction (inconsistent
    snapshots + overhead). Bundle into one internal query/mutation.
11. **Avoid `ctx.runQuery/runMutation` inside queries/mutations** — use helpers; only needed for components or
    partial rollback.
12. **Pass table names to `ctx.db.get/patch/replace/delete`** (`ctx.db.get("movies", id)`). Codemod:
    `npx @convex-dev/codemod@latest explicit-ids`.
13. **No `Date.now()` in queries** for filtering — cached results won't re-run as time passes. Use a boolean/status
    field flipped by a scheduled function, or pass the time from the client (coarsened).

## Patterns
- Client → mutation (write + `scheduler.runAfter(0, internal.action)`) → action (fetch) → internal mutation (write).
- Return `null`, not `undefined`, from queries for "not found" (undefined becomes null anyway).
- Use `ConvexError` for user-facing errors; plain `Error` messages are hidden in prod.
- Keep queries cheap and deterministic: no `Math.random`, `Date.now()` (for logic), or `fetch`.
- Optimistic updates for snappy UI; queries re-sync automatically.
- Multi-tenant: put `orgId` first in compound indexes; check membership in a helper used by all functions.
- Environment vars: `npx convex env set KEY value` (per deployment: dev vs prod). Read via `process.env.KEY` in functions.
- Deployments: `npx convex dev` (dev), `npx convex deploy` (prod), `npx convex deploy --preview-create <name>` (preview).

## Platform limits (Professional/Free similar unless noted)
| Thing | Limit |
|---|---|
| Document size / fields | 1 MiB / 1024 fields (nesting ≤ 16) |
| Transaction (query/mutation) | 16 MiB read, 32,000 docs scanned, 16,000 docs written, 1 s execution |
| Function args & return | 16 MiB (Node action args 5 MiB); scheduled args 4 MiB each, 16 MiB per mutation |
| Action runtime | 30 min (Convex runtime), 10 min (Node); memory 64 MB / 512 MB |
| HTTP action request/response | 20 MiB; streaming allowed |
| Indexes | 32 per table (incl. search), 16 fields each, name ≤ 64 chars; 4 vector indexes/table |
| Search | 16 filter fields, 16 terms, 8 filter expressions, 1024 scanned |
| Vector | dims 2–4096, ≤256 results, ≤64 filter expressions |
| Scheduling | 1000 schedules/mutation; 1,000,000 outstanding |
| Concurrency | 64–2048 concurrent functions depending on plan tier |
| Upload URL | any size, URL valid 2 min |

Exceeding read limits → error "Too many bytes/documents read"; fix with indexes/pagination. OCC conflicts on hot
documents (counters) → use sharded counter component. Monitor Dashboard → Health / Insights.
