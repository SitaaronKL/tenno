# Convex Reference Docs (condensed, LLM-friendly)

Condensed from https://docs.convex.dev (see `llms.txt` / `llms-full.txt`), https://labs.convex.dev/auth, and the
`get-convex/*` component READMEs. Snapshot date: 2026-08-29.

## Packages & versions (npm, as of 2026-08-29)

| Package | Version | Purpose |
|---|---|---|
| `convex` | 1.45.0 | Core SDK: `convex/server`, `convex/values`, `convex/react`, `convex/nextjs` |
| `@convex-dev/auth` | 0.0.95 | Convex Auth (passwords, OAuth, magic links/OTP). Beta. |
| `@auth/core` | 0.41.3 (docs pin `@auth/core@0.41.1`) | Auth.js providers used by Convex Auth (`@auth/core/providers/*`) |
| `@convex-dev/resend` | 0.2.7 | Resend email component (queueing, batching, webhooks) |
| `@convex-dev/agent` | 0.7.1 | AI agent component (threads, streaming, tools, RAG) |
| `@convex-dev/workflow` | 0.4.6 | Durable workflows |
| `@convex-dev/workpool` | 0.4.10 | Work queues w/ retries (used under the hood by resend/workflow) |
| `@convex-dev/rate-limiter` | 0.3.2 | Application-level rate limiting |

## Files

| File | Topic |
|---|---|
| [01-schema-data-modeling.md](01-schema-data-modeling.md) | `defineSchema`, validators, indexes, search/vector indexes, system fields |
| [02-functions.md](02-functions.md) | Queries, mutations, actions, internal functions, reading/writing data, pagination, errors |
| [03-scheduling-cron.md](03-scheduling-cron.md) | `ctx.scheduler.runAfter/runAt`, `_scheduled_functions`, `crons.ts` |
| [04-convex-auth.md](04-convex-auth.md) | `@convex-dev/auth`: setup, password, OAuth, magic link/OTP, server helpers |
| [05-http-actions.md](05-http-actions.md) | `convex/http.ts`, `httpRouter`, CORS, webhooks, auth in HTTP |
| [06-file-storage.md](06-file-storage.md) | Upload URLs, `ctx.storage.*`, serving, metadata, deletion |
| [07-components.md](07-components.md) | What components are, `convex.config.ts`, `app.use`, calling `components.*` |
| [08-component-resend.md](08-component-resend.md) | `@convex-dev/resend` |
| [09-component-agent.md](09-component-agent.md) | `@convex-dev/agent` |
| [10-component-workflow.md](10-component-workflow.md) | `@convex-dev/workflow` |
| [11-component-rate-limiter.md](11-component-rate-limiter.md) | `@convex-dev/rate-limiter` |
| [12-nextjs.md](12-nextjs.md) | App Router provider setup, `ConvexProviderWithAuth`, `preloadQuery`/`fetchQuery`, Convex Auth + Next.js |
| [13-best-practices-limits.md](13-best-practices-limits.md) | Official best practices + platform limits |

## Mental model (30 seconds)

- Backend lives in `convex/`. `npx convex dev` pushes it and generates `convex/_generated/{api,server,dataModel}`.
- Three function kinds: **query** (read, cached, reactive, deterministic), **mutation** (transactional write),
  **action** (side effects / `fetch`; no direct DB access; uses `ctx.runQuery/runMutation`).
- `api.*` = public functions; `internal.*` = only callable from other Convex functions, scheduler, crons, dashboard.
- Reactivity: React `useQuery` subscribes over WebSocket; results update automatically when underlying data changes.
- HTTP endpoints live at `https://<deployment>.convex.site` (note `.site`, not `.cloud`).
- Components are sandboxed sub-backends installed in `convex/convex.config.ts` via `app.use(...)`.
