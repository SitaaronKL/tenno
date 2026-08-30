# Streaming

## Enable

```ts
import { Agent, run } from '@openai/agents';

const stream = await run(agent, 'Tell me a story about a cat.', { stream: true });
// stream: StreamedRunResult — AsyncIterable<RunStreamEvent> + result fields
```

### Text only

```ts
// Web ReadableStream<string>
const textStream = stream.toTextStream();
for await (const chunk of textStream) process.stdout.write(chunk);

// Node Readable
stream.toTextStream({ compatibleWithNodeStreams: true }).pipe(process.stdout);

await stream.completed;         // ALWAYS await before reading finalOutput/history/interruptions
console.log(stream.finalOutput);
```

`toTextStream()` emits assistant text only (no tool calls, no reasoning summaries).

### All events

```ts
for await (const event of stream) {
  if (event.type === 'raw_model_stream_event') {
    // provider events; for OpenAI Responses: event.data.event.type e.g. 'response.output_text.delta'
  } else if (event.type === 'run_item_stream_event') {
    // event.name: 'message_output_created' | 'tool_called' | 'tool_output' | 'handoff_requested' | 'handoff_occurred'
    //             | 'reasoning_item_created' | 'tool_approval_requested' | 'tool_search_called' | 'tool_search_output_created'
    // event.item: RunItem
  } else if (event.type === 'agent_updated_stream_event') {
    console.log('now running', event.agent.name);
  }
}
await stream.completed;
```

Narrowing helpers for OpenAI raw events:

```ts
import { isOpenAIResponsesRawModelStreamEvent, isOpenAIChatCompletionsRawModelStreamEvent } from '@openai/agents';

if (isOpenAIResponsesRawModelStreamEvent(event) && event.data.event.type === 'response.output_text.delta') {
  process.stdout.write(event.data.event.delta);
}
```

Useful Responses raw event types: `response.created`, `response.output_item.added/done`, `response.output_text.delta/done`, `response.reasoning_summary_text.delta`, `response.function_call_arguments.delta/done`, `response.completed`, `response.failed`, `response.incomplete`, `error`.

## StreamedRunResult extras

`completed` (Promise), `toStream()` (web ReadableStream of events), `toTextStream()`, `currentAgent`, `currentTurn`, `maxTurns`, `error`, `cancelled`, plus everything on `RunResult` (`finalOutput`, `history`, `newItems`, `interruptions`, `state`, `lastResponseId`).

## Cancel

Pass `signal` to `run()` and abort, or cancel a reader from `stream.toStream()`. Still `await stream.completed`. `stream.cancelled === true`, `finalOutput` usually `undefined`. To continue the unfinished turn later, `run(agent, stream.state, { stream: true })` (pass the same `session` if used) instead of appending a new user message.

## Human-in-the-loop while streaming

```ts
let stream = await run(agent, 'Weather in SF and Oakland?', { stream: true });
stream.toTextStream({ compatibleWithNodeStreams: true }).pipe(process.stdout);
await stream.completed;

while (stream.interruptions?.length) {
  const state = stream.state;
  for (const interruption of stream.interruptions) {
    const ok = await askUser(`${interruption.agent.name} wants ${interruption.name}(${interruption.arguments})`);
    ok ? state.approve(interruption) : state.reject(interruption);
  }
  stream = await run(agent, state, { stream: true });   // must pass stream: true again
  stream.toTextStream({ compatibleWithNodeStreams: true }).pipe(process.stdout);
  await stream.completed;
}
```

## Serving a stream from an HTTP handler

### Next.js App Router route handler (plain text)

```ts
// app/api/chat/route.ts
import { Agent, run } from '@openai/agents';
export const runtime = 'nodejs';        // not 'edge'
export const maxDuration = 60;          // Vercel function timeout (seconds)

const agent = new Agent({ name: 'Assistant', instructions: 'Be concise.' });

export async function POST(req: Request) {
  const { message } = await req.json();
  const stream = await run(agent, message, { stream: true });
  return new Response(stream.toTextStream(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
```

### AI SDK UI (`useChat`) compatible stream

```ts
import { run } from '@openai/agents';
import { createAiSdkUiMessageStreamResponse, createAiSdkTextStreamResponse, createAiSdkUiMessageStream } from '@openai/agents-extensions/ai-sdk-ui';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const stream = await run(agent, messages.at(-1).content, { stream: true });
  return createAiSdkUiMessageStreamResponse(stream, { headers: {} }); // UIMessageChunk SSE Response
}
```

### Custom SSE of run items

```ts
const encoder = new TextEncoder();
const body = new ReadableStream({
  async start(controller) {
    try {
      for await (const ev of stream) {
        if (ev.type === 'run_item_stream_event') controller.enqueue(encoder.encode(`data: ${JSON.stringify({ name: ev.name })}\n\n`));
        if (isOpenAIResponsesRawModelStreamEvent(ev) && ev.data.event.type === 'response.output_text.delta')
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: ev.data.event.delta })}\n\n`));
      }
      await stream.completed;
    } finally { controller.close(); }
  },
});
return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
```

## Tips

- Model retries are never applied to a streamed run after the first event was emitted.
- Session persistence writes user input first, then appends outputs once the turn completes — still `await completed`.
- WebSocket transport (`setOpenAIResponsesTransport('websocket')`) works with streaming but needs a global `WebSocket` with custom-header support (Node 22 ok; most edge runtimes not).
- Raw Responses API streaming (without the SDK) is covered in 10.
