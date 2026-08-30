# OpenAI Agents SDK (TypeScript) + Responses API — condensed reference

Condensed, LLM-friendly notes distilled from the official docs on 2026-08-29.
Sources: https://openai.github.io/openai-agents-js/ (has `llms.txt`, `llms-small.txt`, `llms-full.txt`,
`_llms-txt/guides.txt`, `_llms-txt/api-reference.txt`) and https://developers.openai.com/api/docs
(every page has a Markdown twin — append `.md` to the URL; `platform.openai.com/docs/*` 301-redirects there).

## Packages and versions (npm, verified 2026-08-29)

| Package | Version | Notes |
| --- | --- | --- |
| `@openai/agents` | 0.17.0 (2026-08-19) | Meta-package: re-exports `@openai/agents-core`, `@openai/agents-openai`, `@openai/agents-realtime`. Pre-1.0: minor bumps can break. |
| `@openai/agents-core` | 0.17.0 | Runtime-agnostic core (Agent, Runner, tool, guardrails, tracing). Use directly for custom providers / smaller bundles. |
| `@openai/agents-openai` | 0.17.0 | OpenAI model provider (Responses + Chat Completions), tracing exporter. |
| `@openai/agents-extensions` | 0.17.0 | Vercel AI SDK adapter (`/ai-sdk`), AI SDK UI stream helpers (`/ai-sdk-ui`), Cloudflare/Twilio realtime transports, experimental Codex tool. |
| `openai` | 7.8.0 (2026-08-27) | Official client. `engines.node >= 22`. Peer-optional `zod ^3.25 || ^4`. Agents SDK requires `openai >= 7.2` if you inject your own client. |
| `zod` | 4.5.4 | `@openai/agents` peerDependency is `zod ^4.0.0`. Use zod 4. |

```bash
npm install @openai/agents openai zod
# optional
npm install @openai/agents-extensions
```

Runtime requirements (Agents SDK): Node.js 22+, Deno 2.35+, Bun 1.2.5+. Cloudflare Workers with `nodejs_compat` (limited). Browsers/v8 isolates: bundleable, tracing off. See [08-runtimes-serverless.md](08-runtimes-serverless.md).

## Files

| File | Covers |
| --- | --- |
| [01-agents-and-runner.md](01-agents-and-runner.md) | `Agent` config, `run()` / `Runner`, agent loop, `RunResult` fields, context injection, dynamic instructions, hooks, errors, `maxTurns` |
| [02-tools.md](02-tools.md) | `tool()` with zod, strict mode, `needsApproval`, timeouts, tool guardrails, hosted tools (web/file search, code interpreter, image gen), agents-as-tools, MCP, tool search / deferred loading, programmatic tool calling |
| [03-structured-outputs.md](03-structured-outputs.md) | `outputType` with zod, `Agent.create()` unions, schema restrictions, `errorHandlers`, raw Responses API `text.format` + `zodTextFormat` |
| [04-handoffs.md](04-handoffs.md) | `handoffs`, `handoff()` options, `inputType`, `inputFilter`, `RECOMMENDED_PROMPT_PREFIX`, handoffs vs agents-as-tools |
| [05-guardrails.md](05-guardrails.md) | Input / output / tool guardrails, `runInParallel`, tripwire errors, `GuardrailExecutionError` recovery |
| [06-streaming.md](06-streaming.md) | `{ stream: true }`, `toTextStream()`, event types, HITL while streaming, cancellation, Next.js route / AI SDK UI helpers |
| [07-tracing.md](07-tracing.md) | Default spans, `withTrace`, disabling, sensitive data, `forceFlush` in serverless, custom processors/exporters |
| [08-runtimes-serverless.md](08-runtimes-serverless.md) | Node/Next.js route handlers, Vercel, Convex actions, Cloudflare Workers, Edge, browsers; timeouts, state serialization, gotchas |
| [09-models-and-pricing.md](09-models-and-pricing.md) | Current model IDs (GPT-5.6 sol/terra/luna etc.), pricing table, `modelSettings`, reasoning effort/mode, verbosity, prompt caching, default model |
| [10-responses-api.md](10-responses-api.md) | Raw `openai` client: `responses.create/parse/stream`, request params, output items, function calling loop, conversation state, streaming events, Responses vs Chat Completions |
| [11-state-sessions-hitl.md](11-state-sessions-hitl.md) | Conversation state strategies (`history`, `session`, `conversationId`, `previousResponseId`), `Session` interface, human-in-the-loop approvals, `RunState` serialization |

## 60-second quick start

```ts
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

const getWeather = tool({
  name: 'get_weather',
  description: 'Get the weather for a city.',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => `The weather in ${city} is sunny.`,
});

const agent = new Agent({
  name: 'Weather bot',
  instructions: 'You are a helpful weather bot.',
  model: 'gpt-5.6-luna',          // default if omitted; see 09-models-and-pricing.md
  tools: [getWeather],
});

const result = await run(agent, 'Weather in Tokyo?');
console.log(result.finalOutput);   // string (or typed object when outputType is set)
```

`OPENAI_API_KEY` is read lazily from the environment; otherwise call `setDefaultOpenAIKey()` / `setDefaultOpenAIClient()`.

## Top gotchas (details in the topic files)

1. Zod 4 only for `@openai/agents` (peer dep `^4.0.0`); `openai` accepts zod 3.25+ or 4.
2. Default model is `gpt-5.6-luna` with `reasoning.effort: 'none'` and `text.verbosity: 'low'`. Set `OPENAI_DEFAULT_MODEL` or `new Runner({ model })` to change globally.
3. `maxTurns` defaults to 10 -> `MaxTurnsExceededError`. Tool-heavy agents need more.
4. Tracing is ON by default in Node/Deno/Bun and exports to OpenAI using your API key. Disable with `OPENAI_AGENTS_DISABLE_TRACING=1` or `setTracingDisabled(true)`. In Cloudflare Workers / short-lived serverless you must `await getGlobalTraceProvider().forceFlush()` before the request ends.
5. Input guardrails only run for the first agent in a run; output guardrails only for the agent that produces the final output. Tool guardrails run per tool call.
6. Structured outputs: every field must be `required`, `additionalProperties: false` (the SDK handles zod objects; avoid `.optional()` — use `.nullable()`), root must be an object.
7. `conversationId` and `previousResponseId` are mutually exclusive, Responses-API-only, and should not be mixed with `history`/`session` for the same conversation.
8. Pick one state strategy per conversation. `RunState` is JSON-serializable (`result.state.toString()` / `RunState.fromString(agent, s)`) for pausing across requests (approvals, serverless).
9. Streaming: always `await stream.completed` before reading `finalOutput`; `{ stream: true }` must be passed again when resuming from a `RunState`.
10. Chat Completions no longer supports tool calling with `reasoning_effort` other than `none` from GPT-5.4 on — use Responses (the SDK default).
11. Explicit prompt-cache breakpoints, `reasoning.mode: 'pro'`, `reasoning.effort: 'max'`, `reasoning.context: 'all_turns'` are GPT-5.6+ and Responses-only.
12. Convex: `@openai/agents` needs the Node runtime (`"use node"` actions), not the default V8 isolate used by queries/mutations/HTTP actions. Node actions cannot stream to clients directly. See 08.
