# Tracing

Built-in tracing records every run: agents, turns, LLM generations, tool calls, handoffs, guardrails. Viewed at https://platform.openai.com/traces.

## Defaults

- **Enabled by default** in Node.js, Deno, Bun. **Disabled** in browsers and when `NODE_ENV=test`.
- Exports to OpenAI using `OPENAI_API_KEY` (or `setTracingExportApiKey('sk-...')`) via `BatchTraceProcessor` -> `OpenAITracingExporter`, on an interval.
- Unavailable for Zero Data Retention orgs.
- Disable: env `OPENAI_AGENTS_DISABLE_TRACING=1`, `setTracingDisabled(true)`, or `new Runner({ tracingDisabled: true })`.
- Exclude LLM/tool inputs & outputs but keep spans: `new Runner({ traceIncludeSensitiveData: false })`.

## Default span hierarchy

`Trace("Agent workflow")` -> `TaskSpan` (per runner invocation; aggregates usage) -> `AgentSpan` -> `TurnSpan` (per loop iteration) -> `GenerationSpan` / `FunctionSpan` / `GuardrailSpan` / `HandoffSpan`.

Turn off task/turn spans: `run(agent, input, { tracing: { includeTaskAndTurnSpans: false } })`.

Trace properties: `workflow_name`, `trace_id` (`trace_<32 alphanumeric>`), `group_id` (e.g. chat thread id to link traces), `metadata`. Set via `RunConfig`: `workflowName`, `traceId`, `groupId`, `traceMetadata`.

## Group multiple runs in one trace

```ts
import { Agent, run, withTrace } from '@openai/agents';

await withTrace('Joke workflow', async () => {
  const joke = await run(agent, 'Tell me a joke');
  const rating = await run(agent, `Rate this joke: ${joke.finalOutput}`);
});
// Also: withTrace(name, fn, { groupId, metadata, traceId })
```

Context propagation uses `AsyncLocalStorage` (Node) — concurrency-safe. Custom spans: `createCustomSpan()`, `withTaskSpan()`, `withTurnSpan()`, `getCurrentTrace()`, `getCurrentSpan()`.

## Serverless / short-lived processes: flush before exit

The export loop is periodic; in Cloudflare Workers it is unavailable and in serverless functions the process may freeze before export. Flush explicitly:

```ts
import { getGlobalTraceProvider } from '@openai/agents';

// Cloudflare Worker
export default {
  async fetch(request, env, ctx) {
    try {
      /* run agent */
      return new Response('ok');
    } finally {
      ctx.waitUntil(getGlobalTraceProvider().forceFlush());
    }
  },
};

// Vercel / Next.js route handler
import { after } from 'next/server';
export async function POST(req: Request) {
  const result = await run(agent, '...');
  after(() => getGlobalTraceProvider().forceFlush());   // or just: await getGlobalTraceProvider().forceFlush();
  return Response.json({ text: result.finalOutput });
}

// Convex "use node" action / AWS Lambda: await before returning
await getGlobalTraceProvider().forceFlush();
```

## Custom processors / exporters

```ts
import { addTraceProcessor, setTraceProcessors, BatchTraceProcessor, ConsoleSpanExporter } from '@openai/agents';
import { OpenAITracingExporter, setDefaultOpenAITracingExporter } from '@openai/agents-openai';

addTraceProcessor(new BatchTraceProcessor(new ConsoleSpanExporter()));       // additional destination
setTraceProcessors([myProcessor]);                                            // replace (OpenAI export stops unless included)
setTraceProcessors([new BatchTraceProcessor(new OpenAITracingExporter({ apiKey, endpoint, organization, project, maxRetries }))]);
setDefaultOpenAITracingExporter();                                            // restore default
```

Implement `TracingProcessor` (`onTraceStart/onTraceEnd/onSpanStart/onSpanEnd/shutdown/forceFlush`) or `TracingExporter` (`export(items)`) for third parties. Known integrations: AgentOps, Respan, PromptLayer, Latitude, Traccia (OpenTelemetry-style bridges).

## Debug logging (separate from tracing)

`DEBUG=openai-agents:*` (or `openai-agents:core`, `openai-agents:openai`, `openai-agents:realtime`). Model/tool payloads are redacted unless `setSensitiveDataLoggingEnabled(true)` or `OPENAI_AGENTS_DONT_LOG_MODEL_DATA=0` / `OPENAI_AGENTS_DONT_LOG_TOOL_DATA=0`.

## Gotchas

- Tracing sends prompts/outputs to OpenAI's trace store by default; for user data compliance either disable, set `traceIncludeSensitiveData: false`, or route to your own processor.
- Serialized `RunState` omits the tracing API key unless `state.toString({ includeTracingApiKey: true })`.
- Realtime/voice sessions trace server-side; disable via `RealtimeSession({ tracingDisabled: true })`.
