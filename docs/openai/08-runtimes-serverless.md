# Running agents in serverless / Node runtimes

## Support matrix (Agents SDK 0.17)

| Runtime | Status | Notes |
| --- | --- | --- |
| Node.js 22+ | Supported | Full: tracing export loop, `AsyncLocalStorage`, stdio MCP, WebSocket transport (`ws` peer dep). |
| Deno 2.35+ / Bun 1.2.5+ | Supported | Same as Node. |
| Cloudflare Workers | Limited | Needs `nodejs_compat`; flush traces manually with `ctx.waitUntil(getGlobalTraceProvider().forceFlush())`; `AsyncLocalStorage` partial (trace nesting may be off); outbound WebSocket must be fetch-upgrade based (Realtime: use `CloudflareRealtimeTransportLayer` from `@openai/agents-extensions`). |
| Vercel Edge / other v8 isolates | Bundleable, untested | Tracing does not work; no WebSocket transport (no custom headers); no stdio MCP. Prefer the Node runtime. |
| Browsers | Bundleable | Tracing disabled by default; never ship API keys — use Realtime with ephemeral keys or call your backend. |
| React Native | Core + realtime shims | Realtime needs `react-native-webrtc`; Expo Go unsupported. |

`openai` client: Node 22+ (`engines`), Deno 1.28+, Bun 1.0+, Cloudflare Workers, Vercel Edge Runtime, browsers with `dangerouslyAllowBrowser`. Default request timeout 10 min, `maxRetries` 2.

## General serverless rules

1. **Create agents/runners at module scope**, reuse across invocations (`new Runner()` once). `Agent` construction is cheap but MCP `connect()` is not.
2. **Bound run time**: `run(agent, input, { maxTurns, signal })` with an `AbortSignal.timeout(ms)` below your platform's max duration, and `modelSettings.timeoutMs` per model call. `openai` client `timeout` too.
3. **Pause across invocations instead of holding the process**: serialize `result.state.toString()` (or `JSON.stringify(result.state)`) to your DB when `result.interruptions.length > 0` or when you need to stop; resume later with `RunState.fromString(agent, str)` (same agent graph rebuilt in the new process). App `context` is serialized with it — do not put secrets in `context`, or use `RunState.fromStringWithContext(agent, str, freshContext)`.
4. **Pick a state strategy** that survives cold starts: `session` backed by your DB, or server-managed `conversationId` / `previousResponseId` (store the id per thread). Avoid `MemorySession`.
5. **Flush traces** before returning (`await getGlobalTraceProvider().forceFlush()`), or disable tracing (`OPENAI_AGENTS_DISABLE_TRACING=1`).
6. **No stdio MCP** in serverless; use hosted MCP (`hostedMcpTool`) or Streamable HTTP servers.
7. **Streaming needs a runtime that can return a streaming `Response`** (Next.js Node route handlers, Cloudflare Workers, Convex HTTP actions). Non-streaming "function invocation" style platforms (Convex `action`, Lambda invoke) can only return the final result — write incremental chunks to the DB instead.
8. **Concurrency**: many tools run in parallel per turn; cap with `toolExecution.maxFunctionToolConcurrency` if tools hit rate-limited APIs.
9. **Retries** are opt-in: `modelSettings.retry` with `retryPolicies.providerSuggested()` etc. Stateful follow-ups (`previousResponseId`/`conversationId`) only retry with provider-approved replay safety.

## Next.js (App Router) route handlers

```ts
// app/api/agent/route.ts
import { NextRequest } from 'next/server';
import { after } from 'next/server';
import { Agent, Runner, getGlobalTraceProvider } from '@openai/agents';

export const runtime = 'nodejs';   // required: Agents SDK is not a good fit for 'edge'
export const maxDuration = 120;    // seconds; Hobby max 60, Pro/Ent up to 800 (fluid compute). Check vercel.com/docs/functions/limitations
export const dynamic = 'force-dynamic';

const runner = new Runner({ workflowName: 'chat-api' });
const agent = new Agent({ name: 'Assistant', instructions: 'Be concise.' });

export async function POST(req: NextRequest) {
  const { message, previousResponseId } = await req.json();
  const result = await runner.run(agent, message, {
    previousResponseId,
    maxTurns: 8,
    signal: AbortSignal.timeout(100_000),
  });
  after(() => getGlobalTraceProvider().forceFlush());
  return Response.json({ text: result.finalOutput, responseId: result.lastResponseId });
}
```

Streaming: return `new Response(stream.toTextStream())` or use `@openai/agents-extensions/ai-sdk-ui` helpers (see 06). Keep `OPENAI_API_KEY` server-only (no `NEXT_PUBLIC_`). Route handlers and Server Actions both work; Server Actions cannot stream token-by-token to the client (use route handler + `fetch`/`useChat`).

Gotchas:
- Next.js bundles route handlers with webpack/turbopack; `@openai/agents` uses Node conditions — if you hit `Module not found: ws`/`node:` errors, add `serverExternalPackages: ['@openai/agents', '@openai/agents-core', '@openai/agents-openai', '@openai/agents-realtime', 'openai']` in `next.config.ts`.
- `after()` (Next 15+) runs after the response is sent — good for flushing traces without adding latency.
- Vercel fluid compute may reuse the process; module-scope `Runner` is fine, but never keep per-user state at module scope.

## Convex

Convex has two runtimes: the default **Convex (V8) runtime** for queries/mutations/actions/HTTP actions and the **Node.js runtime** for actions in files starting with `"use node"`.

| | Convex runtime action | `"use node"` action | HTTP action |
| --- | --- | --- | --- |
| Runtime | Custom V8 (browser-like, `fetch`, partial `AsyncLocalStorage`) | Real Node (default **Node 20**; set 22 or 24 in `convex.json` `"node": { "version": "22" }`) | Convex V8 runtime |
| Max execution | 30 min | **10 min** | 30 min |
| Memory | 64 MiB | 512 MiB | 64 MiB |
| Args limit | 16 MiB | 5 MiB | request body; 20 MiB response |
| Return streaming to client | No | No | Yes (`new Response(readableStream)`) |
| `@openai/agents` | Not recommended (bundled for V8: no tracing, `node:` imports fail) | Recommended path. **Set Node 22+** to meet the SDK's `Node.js 22+` requirement. | Not recommended |
| plain `openai` client | Works (`fetch`-based) | Works | Works, can stream SSE through |

Pattern for agent runs in Convex:

```ts
// convex/agentActions.ts
"use node";
import { action } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { Agent, Runner, RunState, tool, getGlobalTraceProvider, setTracingDisabled } from '@openai/agents';
import { z } from 'zod';

setTracingDisabled(true); // or forceFlush() before returning

const runner = new Runner();
const agent = new Agent({ name: 'Assistant', instructions: '...', tools: [/* tools that use ctx via run context */] });

export const chat = action({
  args: { threadId: v.id('threads'), message: v.string() },
  handler: async (ctx, { threadId, message }) => {
    const thread = await ctx.runQuery(internal.threads.get, { threadId });
    const result = await runner.run(agent, message, {
      previousResponseId: thread.lastResponseId ?? undefined,
      context: { ctx, threadId },          // tools call ctx.runQuery / ctx.runMutation from runContext.context.ctx
      maxTurns: 8,
      signal: AbortSignal.timeout(8 * 60_000), // stay under the 10-minute Node action limit
    });
    if (result.interruptions.length) {
      await ctx.runMutation(internal.threads.savePaused, { threadId, state: result.state.toString() });
      return { status: 'needs_approval', approvals: result.interruptions.map((i) => ({ name: i.name, args: i.arguments })) };
    }
    await ctx.runMutation(internal.threads.saveTurn, { threadId, text: String(result.finalOutput), lastResponseId: result.lastResponseId ?? null });
    await getGlobalTraceProvider().forceFlush();
    return { status: 'done', text: result.finalOutput };
  },
});
```

Convex-specific gotchas:
- Files with `"use node"` may only contain actions; do not import them from query/mutation files. Put shared agent definitions in a `"use node"` utility file.
- Node actions cannot access the DB directly; tools must call `ctx.runQuery` / `ctx.runMutation` (each is its own transaction — not atomic across the run). `AsyncLocalStorage` values do not propagate into `ctx.run*` calls.
- Actions are not retried automatically and are not transactional; make tool side effects idempotent (use `toolCall.callId` as an idempotency key).
- No token streaming from a Node action to the client: write partial text to a table from `run_item_stream_event` / text deltas (batched, e.g. every 50–100 ms) and let the client subscribe via a reactive query. Alternatively use a Convex HTTP action with the raw `openai` client to stream SSE, or the `@convex-dev/agent` component which implements persisted streaming.
- Cold starts are higher for Node actions than Convex-runtime actions; keep the bundle small (`@openai/agents-core` + `@openai/agents-openai` instead of the meta-package if realtime is unused).
- Set the Node version: `{ "node": { "version": "22" } }` in `convex.json` (supported: 20, 22, 24; not on self-hosted).
- Env vars: `OPENAI_API_KEY` via `npx convex env set OPENAI_API_KEY sk-...` (dashboard), not `.env.local`.
- For long jobs, schedule follow-up actions (`ctx.scheduler.runAfter`) and pass serialized `RunState` to continue across the 10-minute limit; or use the Workflow component.
- Consider `@convex-dev/agent` (Convex's own agent component: threads, message persistence, vector search, streaming) when you want DB-native chat state; it uses the Vercel AI SDK model interface, so OpenAI models are used via `@ai-sdk/openai`, not `@openai/agents`.

## Cloudflare Workers

```ts
import { Agent, run, getGlobalTraceProvider } from '@openai/agents';
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    try {
      const result = await run(agent, await request.text());
      return Response.json({ text: result.finalOutput });
    } finally {
      ctx.waitUntil(getGlobalTraceProvider().forceFlush());
    }
  },
};
```

`compatibility_flags = ["nodejs_compat"]` in `wrangler.toml`. Use HTTP transport (default), hosted/HTTP MCP only.

## AWS Lambda / GCP Cloud Functions / similar

Node 22 runtime; same rules: module-scope runner, `await forceFlush()` before returning (the event loop may be frozen after the handler resolves), streaming only via response streaming (`awslambda.streamifyResponse`).

## Bundling notes

- ESM/CJS both provided. Node package conditions select Node shims; bundlers targeting browsers select browser shims (`@openai/agents-core/_shims`).
- `@openai/agents` pulls in `@openai/agents-realtime` (WebRTC/WebSocket code). For server-only usage you can depend on `@openai/agents-core` + `@openai/agents-openai` directly (exports are the same names).
- `zod` must resolve to a single v4 copy (dedupe with your package manager if you also have zod 3 transitively).
