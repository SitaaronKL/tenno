# Responses API (`openai` 7.8) — the primitive under the Agents SDK

`POST /v1/responses`. Successor to Chat Completions: typed **items** instead of messages, built-in agentic loop with hosted tools, server-side state, better cache utilization and reasoning continuity. Use it directly when you do not need the Agents SDK loop (single call, structured extraction, custom loops in edge runtimes).

## Basic call

```ts
import OpenAI from 'openai';
const client = new OpenAI(); // OPENAI_API_KEY; options: apiKey, baseURL, timeout (ms, default 10 min), maxRetries (2), fetch, defaultHeaders

const response = await client.responses.create({
  model: 'gpt-5.6',                 // alias for gpt-5.6-sol; or gpt-5.6-terra / gpt-5.6-luna
  instructions: 'You are a concise assistant.',   // system/developer guidance (must be re-sent every turn, even with previous_response_id)
  input: 'Write a haiku about recursion.',        // string or item array
});
console.log(response.output_text);                // SDK helper: concatenated output_text parts
console.log(response.id, response.usage);
```

## Request parameters (most relevant)

| Param | Meaning |
| --- | --- |
| `model` | Model id. |
| `input` | `string` or array of items: `{ role: 'user'|'assistant'|'developer'|'system', content: string | [{ type: 'input_text', text }, { type: 'input_image', image_url, detail }, { type: 'input_file', file_id | file_data }] }`, plus prior output items (`message`, `reasoning`, `function_call`, `function_call_output`, ...). |
| `instructions` | System-level text; not inherited across `previous_response_id`. |
| `tools` | `[{ type: 'function', name, description, parameters, strict }, { type: 'web_search' }, { type: 'file_search', vector_store_ids }, { type: 'code_interpreter', container: { type: 'auto' } }, { type: 'image_generation' }, { type: 'mcp', server_label, server_url, require_approval }, { type: 'computer' }, { type: 'tool_search' }, { type: 'programmatic_tool_calling' }, { type: 'custom', name, format }]` |
| `tool_choice` | `'auto' \| 'required' \| 'none' \| { type: 'function', name } \| { type: 'web_search' }` etc. |
| `parallel_tool_calls` | boolean (default true). |
| `text` | `{ format: { type: 'text' } \| { type: 'json_schema', name, schema, strict } \| { type: 'json_object' }, verbosity: 'low'|'medium'|'high' }` |
| `reasoning` | `{ effort: 'none'|'minimal'|'low'|'medium'|'high'|'xhigh'|'max', mode: 'standard'|'pro', context: 'auto'|'current_turn'|'all_turns', summary: 'auto'|'concise'|'detailed' }` |
| `previous_response_id` | Continue from a stored response (server keeps context). |
| `conversation` | Conversation id (`conv_...`) from the Conversations API; mutually exclusive with `previous_response_id`. |
| `store` | Default **true** (responses are stored 30 days, retrievable via `responses.retrieve`). `false` for stateless/ZDR — encrypted reasoning is then returned inline. |
| `stream` | SSE events (see below). |
| `background` | Run asynchronously; poll `responses.retrieve(id)` / `responses.cancel(id)`. |
| `max_output_tokens` | Caps visible + reasoning output tokens. |
| `max_tool_calls` | Cap built-in tool calls. |
| `temperature`, `top_p` | Ignored/limited on reasoning models. |
| `truncation` | `'auto'` drops middle context when overflowing; `'disabled'` (default) errors. |
| `include` | Extra fields, e.g. `['web_search_call.action.sources', 'file_search_call.results', 'reasoning.encrypted_content', 'message.output_text.logprobs', 'code_interpreter_call.outputs']`. |
| `metadata` | Up to 16 key/value strings. |
| `prompt` | `{ id, version, variables }` stored prompt. |
| `prompt_cache_key`, `prompt_cache_options` (`{ mode, ttl }`), `prompt_cache_retention` | Caching (see 09). |
| `safety_identifier` | Stable hashed end-user id (recommended on GPT-5.6). |
| `service_tier` | `'auto' \| 'default' \| 'flex' \| 'priority'`. |
| `user` | Legacy end-user id. |

## Response object

```ts
{
  id: 'resp_...', object: 'response', created_at, status: 'completed' | 'incomplete' | 'failed' | 'in_progress' | 'queued' | 'cancelled',
  model, output: OutputItem[], output_text: string /* SDK convenience */,
  incomplete_details?: { reason: 'max_output_tokens' | 'content_filter' }, error?: { code, message },
  usage: { input_tokens, input_tokens_details: { cached_tokens }, output_tokens, output_tokens_details: { reasoning_tokens }, total_tokens },
  reasoning?: { effort, context }, previous_response_id, conversation, metadata, ...
}
```

Output item types: `message` (`{ role: 'assistant', content: [{ type: 'output_text', text, annotations }, { type: 'refusal', refusal }], phase?: 'commentary' | 'final_answer' }`), `reasoning` (`{ summary, encrypted_content? }`), `function_call` (`{ name, arguments: string, call_id }`), `web_search_call`, `file_search_call`, `code_interpreter_call`, `image_generation_call`, `mcp_call` / `mcp_list_tools` / `mcp_approval_request`, `computer_call`, `tool_search_call` / `tool_search_output`, `program_output`, `custom_tool_call`.

## Function calling loop

```ts
const tools: OpenAI.Responses.Tool[] = [{
  type: 'function', name: 'get_horoscope', description: "Get today's horoscope for a sign.",
  parameters: { type: 'object', properties: { sign: { type: 'string' } }, required: ['sign'], additionalProperties: false },
  strict: true,
}];

let input: OpenAI.Responses.ResponseInput = [{ role: 'user', content: 'What is my horoscope? I am an Aquarius.' }];

let response = await client.responses.create({ model: 'gpt-5.6', tools, input });
input.push(...response.output);                     // keep reasoning + function_call items in order

for (const item of response.output) {
  if (item.type !== 'function_call') continue;
  const args = JSON.parse(item.arguments);
  const result = getHoroscope(args.sign);
  input.push({ type: 'function_call_output', call_id: item.call_id, output: typeof result === 'string' ? result : JSON.stringify(result) });
}

response = await client.responses.create({ model: 'gpt-5.6', tools, input });
console.log(response.output_text);
```

Rules: pass back **all** items since the last user message (reasoning, function_call, function_call_output) untouched; `output` may also be a content array (text/images). With `previous_response_id`, send only the `function_call_output` items as `input`. Namespaces (`{ type: 'namespace', name, tools }`), tool search and custom tools with context-free grammars (Lark/regex) are available for advanced cases.

## Conversation state (3 options)

```ts
// 1. previous_response_id (simplest; store defaults true)
const r1 = await client.responses.create({ model: 'gpt-5.6', input: 'Capital of France?' });
const r2 = await client.responses.create({ model: 'gpt-5.6', input: 'And its population?', previous_response_id: r1.id });

// 2. Manual replay (stateless / ZDR): carry output items forward, store: false
let history: OpenAI.Responses.ResponseInput = [{ role: 'user', content: 'tell me a joke' }];
const a = await client.responses.create({ model: 'gpt-5.6', input: history, store: false });
history.push(...a.output, { role: 'user', content: 'another' });   // includes encrypted reasoning items
const b = await client.responses.create({ model: 'gpt-5.6', input: history, store: false });

// 3. Conversations API (named, shareable state)
const conv = await client.conversations.create({});
await client.responses.create({ model: 'gpt-5.6', input: 'hi', conversation: conv.id });
```

Preserve assistant `phase` values when replaying manually (5.4/5.5 may otherwise treat preambles as final answers). Compaction: `client.responses.compact(...)` shrinks long histories.

## Structured outputs

`text: { format: zodTextFormat(Schema, 'name') }` with `client.responses.parse()` -> `response.output_parsed`. See 03.

## Streaming (SSE)

```ts
const stream = await client.responses.create({ model: 'gpt-5.6', input: 'Say hi', stream: true });
for await (const event of stream) {
  switch (event.type) {
    case 'response.created': break;
    case 'response.output_item.added': break;                 // event.item.type: 'message' | 'function_call' | 'reasoning' ...
    case 'response.output_text.delta': process.stdout.write(event.delta); break;
    case 'response.output_text.done': break;
    case 'response.function_call_arguments.delta': break;     // event.delta (string), event.item_id
    case 'response.function_call_arguments.done': break;      // event.arguments
    case 'response.reasoning_summary_text.delta': break;
    case 'response.output_item.done': break;
    case 'response.completed': console.log(event.response.usage); break;
    case 'response.incomplete': case 'response.failed': case 'error': break;
  }
}

// Helper with accumulation:
const s = client.responses.stream({ model: 'gpt-5.6', input: '...' });
s.on('response.output_text.delta', (e) => process.stdout.write(e.delta));
const final = await s.finalResponse();
```

Other events: `response.in_progress`, `response.content_part.added/done`, `response.refusal.delta/done`, `response.web_search_call.*`, `response.file_search_call.*`, `response.code_interpreter_call.*`, `response.mcp_call.*`, `response.image_generation_call.partial_image`, `response.queued`. Every event carries `sequence_number`.

## Other endpoints

`client.responses.retrieve(id, { stream?, include? })`, `.delete(id)`, `.cancel(id)` (background only), `.inputItems.list(id)`, `.compact(...)`. Conversations: `client.conversations.create/retrieve/update/delete`, `.items.create/list/retrieve/delete`.

## Responses vs Chat Completions cheat sheet

| Chat Completions | Responses |
| --- | --- |
| `messages` | `input` (+ `instructions`) |
| `choices[0].message.content` | `output_text` / `output[]` items |
| `{ type: 'function', function: { name, parameters } }` | `{ type: 'function', name, parameters }` |
| `tool_calls[].id` + `role: 'tool'` message | `function_call.call_id` + `function_call_output` item |
| `response_format` | `text.format` |
| `max_tokens` / `max_completion_tokens` | `max_output_tokens` |
| `reasoning_effort` | `reasoning.effort` |
| manual history only | `previous_response_id` / `conversation` / manual |
| delta chunks | typed SSE events |

Chat Completions remains supported but: no hosted tools, no reasoning continuity, no phase field, and from GPT-5.4 on tool calling only with `reasoning_effort: 'none'`.

## Client gotchas

- `openai` 7.x: `engines.node >= 22`; ESM-first; `import OpenAI from 'openai'`; `openai/helpers/zod` requires zod peer.
- Errors: `OpenAI.APIError` subclasses (`RateLimitError` 429, `AuthenticationError` 401, `BadRequestError` 400, `APIConnectionTimeoutError`). Retries (2 by default, exponential backoff) on connection errors, 408/409/429/5xx.
- `.withResponse()` gives raw `Response` + `request_id`; log `request_id` when contacting support.
- Reasoning tokens count toward `max_output_tokens`; leave headroom (e.g. 25k+) for `high`/`xhigh`/`max`.
- Images with `detail: 'original'`/`'auto'` on GPT-5.6 keep full resolution — token cost scales with size.
