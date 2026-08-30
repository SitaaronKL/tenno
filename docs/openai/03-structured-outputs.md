# Structured outputs

## Agents SDK: `outputType`

```ts
import { Agent, run } from '@openai/agents';
import { z } from 'zod';

const CalendarEvent = z.object({
  name: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
});

const extractor = new Agent({
  name: 'Calendar extractor',
  instructions: 'Extract calendar events from the supplied text.',
  outputType: CalendarEvent,
});

const result = await run(extractor, 'Alice and Bob go to a science fair on Friday.');
result.finalOutput; // { name: string; date: string; participants: string[] } | undefined
```

- zod object -> the SDK sends a strict JSON schema via Responses `text.format` and validates/parses locally; `finalOutput` is `z.infer<typeof Schema>`.
- Standard Schema (e.g. Valibot + `@valibot/to-json-schema`) -> same validation + inferred type; must be synchronous.
- Raw JSON Schema object -> parsed only; `finalOutput: unknown`.
- `finalOutput` is `undefined` when the run paused (approval) or was cancelled.
- Invalid/missing structured final output throws `ModelBehaviorError`; refusals throw `ModelRefusalError`. Convert to fallbacks with `run(agent, input, { errorHandlers: { invalidFinalOutput: ({ error }) => ({ finalOutput: { ... } }), modelRefusal: ... } })`.

### Handoffs with different output types

Use `Agent.create()` so TypeScript infers the union:

```ts
const refundAgent = new Agent({ name: 'Refund Agent', outputType: z.object({ refundApproved: z.boolean() }) });
const orderAgent = new Agent({ name: 'Order Agent', outputType: z.object({ orderId: z.string() }) });
const triage = Agent.create({ name: 'Triage', instructions: '...', handoffs: [refundAgent, orderAgent] });

const r = await run(triage, 'I need a refund');
r.finalOutput; // { refundApproved: boolean } | { orderId: string } | string | undefined
```

### Structured tool results

`tool({ outputSchema: z.object({...}) })` (Responses only) validates what `execute` returns; invalid -> `InvalidToolOutputError`.

## Schema rules (OpenAI strict Structured Outputs)

The SDK converts zod to JSON Schema and normalizes for strict mode, but design schemas to fit the subset:

- Root must be an object (not `anyOf`, not array/scalar). Wrap scalars: `z.object({ items: z.array(...) })`.
- All properties must be required. Use `.nullable()` for optional-ish fields instead of `.optional()`.
- `additionalProperties: false` on every object (zod objects produce this).
- Supported types: string, number, integer, boolean, object, array, enum, anyOf, `$ref`/definitions, recursive schemas.
- Supported keywords include `pattern`, `format` (date-time, time, date, duration, email, hostname, uuid, ipv4, ipv6), `minimum/maximum/multipleOf`, `minItems/maxItems`, `enum`. Unsupported: `minLength/maxLength` etc. on strings are limited — check the guide if a keyword errors.
- Limits: nesting depth (<= 5 levels), <= 5000 properties total, enum values limited, total string size limits.
- Order of keys in output follows schema order.
- Structured Outputs != JSON mode. JSON mode (`text.format: { type: 'json_object' }`) only guarantees valid JSON.

## Raw Responses API (`openai` 7.x)

### `responses.parse` + `zodTextFormat`

```ts
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const openai = new OpenAI();
const CalendarEvent = z.object({ name: z.string(), date: z.string(), participants: z.array(z.string()) });

const response = await openai.responses.parse({
  model: 'gpt-5.6',
  input: [
    { role: 'system', content: 'Extract the event information.' },
    { role: 'user', content: 'Alice and Bob are going to a science fair on Friday.' },
  ],
  text: { format: zodTextFormat(CalendarEvent, 'event') },
});

const event = response.output_parsed; // typed
```

### Manual JSON schema

```ts
const response = await openai.responses.create({
  model: 'gpt-5.6',
  input: 'Jane, 54 years old',
  text: {
    format: {
      type: 'json_schema',
      name: 'person',
      strict: true,
      schema: {
        type: 'object',
        properties: { name: { type: 'string' }, age: { type: 'number' } },
        required: ['name', 'age'],
        additionalProperties: false,
      },
    },
  },
});
const person = JSON.parse(response.output_text);
```

### Edge cases to handle

- Refusal: message content part `{ type: 'refusal', refusal: '...' }` instead of `output_text` (with `parse`, check `output[0].content[0].type === 'refusal'`).
- Truncation: `response.status === 'incomplete'` with `incomplete_details.reason === 'max_output_tokens'` -> JSON may be partial.
- Content filter: `incomplete_details.reason === 'content_filter'`.
- Streaming structured output: iterate `response.output_text.delta` events and parse at the end (`openai.responses.stream(...)` helper also exposes `.finalResponse()`).

Chat Completions equivalent uses `response_format` (deprecated path); prefer Responses `text.format`.
