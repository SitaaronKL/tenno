# Conversation state, sessions and human-in-the-loop

## Pick exactly one state strategy per conversation

| Strategy | Where state lives | Next turn you pass | Good for |
| --- | --- | --- | --- |
| `result.history` | Your app | `run(agent, history.concat(user(text)))` | Small loops, full control, any provider |
| `session` | Your storage via `Session` interface (or OpenAI Conversations) | same `session` object + new text | Persistent chat, resumable runs, custom stores (Convex/Postgres/Redis) |
| `conversationId` | OpenAI Conversations API | `{ conversationId }` + only the new user turn | Shared server-side state across services |
| `previousResponseId` | OpenAI stored responses | `{ previousResponseId: result.lastResponseId }` + new turn | Cheapest server-managed continuation |

`conversationId` and `previousResponseId`: Responses API only, mutually exclusive, do not also pass `history`. Both rely on `store: true` (default) — unusable under ZDR; use `session`/`history` with `store: false` there (encrypted reasoning is carried in the items).

```ts
// previousResponseId
const first = await run(agent, 'What city is the Golden Gate Bridge in?');
const second = await run(agent, 'What state is it in?', { previousResponseId: first.lastResponseId });

// conversationId
const { id: conversationId } = await new OpenAI().conversations.create({});
await run(agent, 'Hi', { conversationId });
await run(agent, 'More', { conversationId });
```

## Sessions

```ts
import { Agent, run, OpenAIConversationsSession, MemorySession } from '@openai/agents';

const session = new OpenAIConversationsSession({ conversationId: 'conv_123' /* optional; created lazily */ });
await run(agent, 'What city is the Golden Gate Bridge in?', { session });
await run(agent, 'What state is it in?', { session });

const dev = new MemorySession(); // process-local, for tests/demos only
```

Runner behavior with a session: fetch stored items -> prepend to new input -> run -> `session.addItems(userInput + outputs)` after the turn (streaming: input written first, outputs on completion). When resuming from `RunState`, pass the same `session`. `sessionInputCallback` customizes the merge; `callModelInputFilter` edits (and, with a session, persists) the final model input. `OpenAIResponsesCompactionSession` wraps any session to auto-compact history.

### Custom `Session` (five async methods)

```ts
import type { AgentInputItem, Session } from '@openai/agents-core';

export class DbSession implements Session {
  constructor(private readonly id: string, private readonly db: Db) {}
  async getSessionId() { return this.id; }
  async getItems(limit?: number): Promise<AgentInputItem[]> { return this.db.loadItems(this.id, limit); }   // oldest -> newest
  async addItems(items: AgentInputItem[]) { await this.db.appendItems(this.id, items); }
  async popItem(): Promise<AgentInputItem | undefined> { return this.db.popLast(this.id); }
  async clearSession() { await this.db.clear(this.id); }
}
```

Helpers: `session.getItems()`, `addItems()`, `popItem()` (undo last), `clearSession()`. Examples for Prisma/file-backed stores live in `examples/memory/` of the SDK repo.

## Human-in-the-loop (approvals)

```ts
const cancelOrder = tool({
  name: 'cancelOrder', description: 'Cancel an order',
  parameters: z.object({ orderId: z.number() }),
  needsApproval: true,                                             // or async (ctx, { orderId }) => orderId > 1000
  execute: async ({ orderId }) => `cancelled ${orderId}`,
});
```

Flow:
1. When a tool needing approval is called, the run pauses at the end of the turn; `result.interruptions` contains `RunToolApprovalItem`s (`agent`, `name`, `arguments`, `rawItem`), `finalOutput` is `undefined`.
2. Persist `result.state.toString()` (JSON string) if you must wait across processes.
3. Later: `const state = await RunState.fromString(agent, saved)` (same root agent graph rebuilt), then for each interruption `state.approve(item, { alwaysApprove?: true })` or `state.reject(item, { alwaysReject?: true, message?: 'why' })`.
4. `result = await run(agent, state)` (add `{ stream: true }` for streaming). Loop while `result.interruptions.length`.

```ts
let result = await run(agent, 'Cancel order 1234');
while (result.interruptions?.length) {
  const saved = result.state.toString();                 // store in DB, return to client, wait...
  const state = await RunState.fromString(agent, saved);
  for (const i of result.interruptions) (await userApproves(i)) ? state.approve(i) : state.reject(i, { message: 'Declined by user' });
  result = await run(agent, state);
}
console.log(result.finalOutput);
```

Details:
- Partial resolution is fine; unresolved approvals pause again.
- `state.addInput('new user text')` before resuming to admit new input; `state.pendingInput` / `state.clearPendingInput()`.
- Nested `agent.asTool()` approvals surface on the outer run; resolve on the outer `state`.
- Hosted MCP (`requireApproval` + `onApproval`), `shellTool`/`applyPatchTool` (`onApproval`) can approve programmatically without pausing.
- `needsApproval` functions are only called after args parse; malformed args fail closed (approval requested, tool never runs).
- Serialized state includes your `context` (avoid secrets) and excludes tracing API key by default. Use `RunState.fromStringWithContext(agent, str, ctx, { contextStrategy: 'merge' | 'replace' })` to inject fresh context (e.g. a new Convex `ctx`).
- If you version agent definitions while states are paused, store your app version alongside the state and keep both SDK versions installed via package aliases.
- Input guardrails do not re-run on resume; output guardrails can be retried from `GuardrailExecutionError.state`.

## Cancellation and resume

`run(agent, input, { signal })`; on abort of a streamed run `stream.cancelled === true`. Resume the same turn with `run(agent, stream.state)` rather than a new user message so turn counts and `previousResponseId`/`conversationId` stored in the state stay consistent.
