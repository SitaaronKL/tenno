# Models and pricing (verified against developers.openai.com/api/docs/models and /pricing on 2026-08-29)

Prices are USD per 1M tokens, standard tier. Batch API is 50% off; priority/"fast" tier is 2x. Verify before quoting; this page changes frequently.

## Current flagship family: GPT-5.6 (GA 2026-07-09)

New naming: `gpt-5.6` is an alias that routes to `gpt-5.6-sol`. Three tiers, all 1.05M context / 128K max output / knowledge cutoff 2026-02-16:

| Model | Positioning | Input | Cached input | Output |
| --- | --- | --- | --- | --- |
| `gpt-5.6-sol` (= `gpt-5.6`) | Flagship for complex professional work | $4.00 | $0.40 | $20.00 |
| `gpt-5.6-terra` | Balanced capability/cost | $2.00 | $0.20 | $12.00 |
| `gpt-5.6-luna` | Cost-sensitive, high volume (**Agents SDK default**) | $0.20 | $0.02 | $1.20 |
| `gpt-5.6-cyber` | Cybersecurity (gated) | $12.50 | $1.25 | $75.00 |

GPT-5.6 features: `reasoning.effort` up to `max`; `reasoning.mode: 'pro'`; persisted reasoning (`reasoning.context: 'all_turns'` default); explicit prompt-cache breakpoints (writes 1.25x input, reads 0.1x, min cacheable prefix 1,024 tokens, TTL `30m`); Programmatic Tool Calling; hosted multi-agent (beta); tool search; original-resolution image input. GPT-5.6 runs synchronous cyber/bio safety classifiers that can pause or refuse mid-stream; send a stable `safety_identifier` per end user.

## Previous generations (still available)

| Model | Input | Cached | Output | Notes |
| --- | --- | --- | --- | --- |
| `gpt-5.5` | $5.00 | $0.50 | $30.00 | Default effort `medium`; supports `xhigh`; uses assistant `phase` field. |
| `gpt-5.5-pro` | $30.00 | – | $180.00 | |
| `gpt-5.4` | $2.50 | $0.25 | $15.00 | First with GA `computer` tool, tool search. |
| `gpt-5.4-mini` | $0.75 | $0.075 | $4.50 | |
| `gpt-5.4-nano` | $0.20 | $0.02 | $1.25 | |
| `gpt-5.4-pro` | $30.00 | – | $180.00 | |
| `gpt-5.3-codex` | $1.75 | $0.175 | $14.00 | Coding-agent tuned. |
| `gpt-5.2` | $1.75 | $0.175 | $14.00 | |
| `gpt-5.1` | $1.25 | $0.125 | $10.00 | |
| `gpt-5` | $1.25 | $0.125 | $10.00 | |
| `gpt-5-mini` | $0.25 | $0.025 | $2.00 | |
| `gpt-5-nano` | $0.05 | $0.005 | $0.40 | Cheapest text model. |
| `gpt-5-search-api` | $1.25 | $0.125 | $10.00 | |
| `chat-latest` | $5.00 | $0.50 | $30.00 | ChatGPT-tuned alias. |
| `gpt-4.1` / `-mini` / `-nano` | $2.00 / $0.40 / $0.10 | $0.50 / $0.10 / $0.025 | $8.00 / $1.60 / $0.40 | Non-reasoning; 1M context. |
| `gpt-4o` / `gpt-4o-mini` | $2.50 / $0.15 | $1.25 / $0.075 | $10.00 / $0.60 | Legacy. |
| `o3` / `o3-mini` / `o4-mini` | $2.00 / $1.10 / $1.10 | $0.50 / $0.55 / $0.275 | $8.00 / $4.40 / $4.40 | Legacy reasoning. |
| `o1` / `o1-pro` / `o3-pro` | $15 / $150 / $20 | | $60 / $600 / $80 | Legacy. |

Other: `text-embedding-3-small` $0.02, `text-embedding-3-large` $0.13 (per 1M input). `omni-moderation-latest` free. Images: `gpt-image-2`. Realtime/audio: `gpt-realtime-2.1`, `gpt-realtime-2.1-mini`, `gpt-realtime-2`, `gpt-realtime-1.5`, `gpt-realtime-translate`; TTS `gpt-4o-mini-tts`; STT `gpt-transcribe`, `gpt-live-transcribe`, `gpt-realtime-whisper`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`. Tool pricing: web search $10/1k calls (+tokens); file search $2.50/1k calls + $0.10/GB/day (1 GB free); code interpreter/hosted shell $0.03–$1.92 per 20-min session.

## Choosing

- Default / high-volume / guardrail classifiers / simple tool routing: `gpt-5.6-luna` (effort `none` or `low`).
- General agents with tools and planning: `gpt-5.6-terra` (effort `low`/`medium`).
- Hard reasoning, coding, research: `gpt-5.6-sol` (effort `medium`/`high`; `xhigh`/`max` or `mode: 'pro'` only if evals justify).
- Migrating from 5.5/5.4: keep your effort, then test one level lower — 5.6 is more token-efficient.
- Reasoning tokens are billed as output tokens and count against context; cap with `max_output_tokens` / `modelSettings.maxTokens`.

## Agents SDK model configuration

```ts
import { Agent, Runner } from '@openai/agents';

// Per agent
const agent = new Agent({
  name: 'Researcher',
  model: 'gpt-5.6-sol',
  modelSettings: {
    reasoning: { effort: 'high', summary: 'auto' },   // effort: none|minimal|low|medium|high|xhigh|max
    text: { verbosity: 'low' },                        // low|medium|high
    maxTokens: 4000,
    timeoutMs: 60_000,
  },
});

// Global default for agents without a model
const runner = new Runner({ model: 'gpt-5.6-terra', modelSettings: { reasoning: { effort: 'low' } } });
// or env: OPENAI_DEFAULT_MODEL=gpt-5.6-terra
```

Default when nothing is set: `gpt-5.6-luna`, `reasoning.effort: 'none'`, `text.verbosity: 'low'`. For non-GPT-5 model names without custom settings the SDK uses generic settings.

### `ModelSettings` reference

| Field | Type |
| --- | --- |
| `temperature`, `topP`, `frequencyPenalty`, `presencePenalty` | number |
| `toolChoice` | `'auto' \| 'required' \| 'none' \| '<tool name>' \| 'computer'` |
| `parallelToolCalls` | boolean |
| `truncation` | `'auto' \| 'disabled'` |
| `maxTokens` | number (max_output_tokens) |
| `timeoutMs` | per model request attempt -> `ModelTimeoutError` |
| `store` | boolean (Responses `store`) |
| `reasoning` | `{ effort?, mode?: 'standard' \| 'pro', context?: 'auto' \| 'current_turn' \| 'all_turns', summary?: 'auto' \| 'concise' \| 'detailed' }` (`mode`/`context` Responses-only) |
| `text` | `{ verbosity: 'low' \| 'medium' \| 'high' }` |
| `promptCacheOptions` | `{ mode?: 'implicit' \| 'explicit', ttl?: '30m' }` (GPT-5.6+) |
| `promptCacheRetention` | `'in-memory' \| '24h' \| null` (pre-5.6 models) |
| `contextManagement` | server-side compaction config |
| `providerData` | passthrough of any raw request field (e.g. `{ safety_identifier: 'u_123', service_tier: 'priority', metadata: {...} }`) |
| `retry` | `{ maxRetries, backoff: { initialDelayMs, maxDelayMs, multiplier, jitter }, policy }` with `retryPolicies.any/all/providerSuggested/retryAfter/networkError/httpStatus/never` |
| `preserveRawUsage` | boolean |

Runner-level settings override agent-level; nested objects merge.

### Explicit prompt caching (GPT-5.6+)

```ts
const agent = new Agent({
  name: 'Research assistant', model: 'gpt-5.6',
  modelSettings: { promptCacheOptions: { mode: 'explicit', ttl: '30m' } },
});
await run(agent, [{
  role: 'user',
  content: [
    { type: 'input_text', text: 'LONG STABLE PREFIX...', promptCacheBreakpoint: { mode: 'explicit' } },
    { type: 'input_text', text: 'Changing question' },
  ],
}]);
```

Implicit mode (default) auto-places a breakpoint at the end of the latest eligible message. Up to 4 cache writes per request; top-level `instructions` cannot hold a breakpoint (put reusable instructions in a developer message `input_text` block). Keep tool definitions and system prefix byte-stable and append-only for hits. Use `prompt_cache_key` (providerData) to route related requests to the same cache.

### Stored prompts (Responses only)

```ts
new Agent({ name: 'A', prompt: { promptId: 'pmpt_...', version: '3', variables: { tier: 'pro' } } });
// or prompt: (runContext) => ({ promptId, version, variables })
```

### Other providers

- Chat Completions: `setOpenAIAPI('chat_completions')` or `new OpenAIProvider({ useResponses: false })`. Loses hosted tools, `previousResponseId`, prompts, `reasoning.mode/context`, deferred tools; from GPT-5.4 on, tool calling only with `reasoning_effort: none`.
- OpenAI-compatible endpoints: `setDefaultOpenAIClient(new OpenAI({ baseURL }))`.
- Any Vercel AI SDK provider: `aisdk(model)` from `@openai/agents-extensions/ai-sdk` (beta; no tool search / PTC).
- Custom: implement `Model` + `ModelProvider`, pass `new Runner({ modelProvider })` or `setDefaultModelProvider()`.
- WebSocket transport for Responses: `setOpenAIResponsesTransport('websocket')` (Node 22 only realistically).
