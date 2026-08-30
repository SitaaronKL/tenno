# Agent and Runner basics (`@openai/agents` 0.17)

## Agent

An `Agent` = instructions (system prompt) + model (+ settings) + tools/handoffs/guardrails/outputType.

```ts
import { Agent } from '@openai/agents';

const agent = new Agent({
  name: 'Haiku Agent',                       // required
  instructions: 'Always respond in haiku.',  // required: string | (runContext, agent) => string | Promise<string>
  model: 'gpt-5.6-terra',                    // optional; string name or a Model instance. Default: gpt-5.6-luna
});
```

### Constructor options (most used)

| Property | Notes |
| --- | --- |
| `name` | Required. Also used to derive handoff tool name `transfer_to_<snake_name>`. |
| `instructions` | String or function of `RunContext` (sync/async). |
| `prompt` | Server-stored prompt `{ promptId, version?, variables? }` or function returning one. Responses API only. |
| `handoffDescription` | Text appended to the auto-generated handoff tool description. |
| `handoffs` | `Agent[]` or `Handoff[]` (see 04). |
| `model` / `modelSettings` | See 09. `modelSettings.providerData` passes through anything not modeled. |
| `tools` | `Tool[]` (see 02). |
| `mcpServers` / `mcpConfig` | MCP servers (see 02). |
| `inputGuardrails` / `outputGuardrails` | See 05. |
| `outputType` | zod schema / Standard Schema / raw JSON schema -> structured output (see 03). |
| `toolUseBehavior` | `'run_llm_again'` (default) \| `'stop_on_first_tool'` \| `{ stopAtToolNames: [...] }` \| `(ctx, toolResults) => ...`. Function tools only. |
| `resetToolChoice` | Default `true`: after a tool call, `toolChoice` resets to `'auto'` to prevent loops. |

### Context (dependency injection)

`Agent<TContext, TOutput>`. The `context` object passed to `run()` is forwarded to every tool, guardrail, handoff callback and dynamic-instructions function. It is NOT sent to the model.

```ts
interface UserContext { uid: string; isProUser: boolean; fetchPurchases(): Promise<Purchase[]> }

const agent = new Agent<UserContext>({
  name: 'Personal shopper',
  instructions: (rc) => `User ${rc.context.uid}. Pro: ${rc.context.isProUser}.`,
});

const result = await run(agent, 'Find me running shoes', {
  context: { uid: 'abc', isProUser: true, fetchPurchases: async () => [] },
});
```

Tools receive it as the second arg: `execute: async (args, runContext) => runContext?.context.uid`.

### Lifecycle hooks

```ts
agent.on('agent_start', (ctx, agent) => {});
agent.on('agent_end', (ctx, output) => {});
agent.on('agent_handoff', (ctx, nextAgent) => {});
agent.on('agent_tool_start', (ctx, tool, { toolCall }) => {});
agent.on('agent_tool_end', (ctx, tool, result, { toolCall }) => {});
// Runner emits the same names with (ctx, agent, ...) args for the whole run.
```

### clone()

`agent.clone({ name, instructions })` returns a new Agent. List props (`tools`, `handoffs`, `mcpServers`, guardrails) are shared by reference unless you pass a new array.

## Running: `run()` vs `Runner`

```ts
import { Agent, run, Runner } from '@openai/agents';

// Singleton default runner
const result = await run(agent, 'Write a haiku about recursion.');

// Or your own runner (create once at app start, reuse across requests)
const runner = new Runner({ model: 'gpt-5.6-terra', modelSettings: { temperature: 0.3 } });
const result2 = await runner.run(agent, 'input');
```

Input can be: a `string` (user message), `AgentInputItem[]` (Responses-style items, e.g. `result.history` + new message), or a `RunState` (resume).

### The agent loop

1. Call current agent's model with current input.
2. If the response has a final output (text/structured of the expected type and no tool calls) -> return.
3. Handoff -> switch agent, keep history, go to 1.
4. Tool calls -> execute tools (function tools locally, in parallel), append outputs, go to 1.
5. `maxTurns` reached (default **10**) -> `MaxTurnsExceededError` (pass `maxTurns: null` to disable).

### Run options (third arg to `run` / `runner.run`)

| Option | Default | Meaning |
| --- | --- | --- |
| `stream` | `false` | Return `StreamedRunResult` (see 06). |
| `context` | – | DI object. |
| `maxTurns` | `10` | Model-call limit. |
| `signal` | – | `AbortSignal` cancels the run. |
| `session` | – | Persistent memory (see 11). |
| `conversationId` / `previousResponseId` | – | Server-managed state, Responses only, mutually exclusive (see 11). |
| `callModelInputFilter` | – | `({ agent, context, modelData }) => ({ input, instructions? })` edit model input right before each call (redaction, truncation). |
| `toolErrorFormatter` | – | Customize approval-rejection / tool-not-found messages returned to the model. |
| `toolExecution` | – | `{ maxFunctionToolConcurrency?, preApprovalInputGuardrails? }`. |
| `toolNotFoundBehavior` | `'raise_error'` | or `'return_error_to_model'`. |
| `errorHandlers` | – | `{ maxTurns?, modelRefusal?, invalidFinalOutput?, default? }` each `({ error, context, runData }) => ({ finalOutput, includeInHistory? })` to turn errors into a final output. |
| `tracing` | – | Per-run tracing overrides (see 07). |
| `reasoningItemIdPolicy` | `'preserve'` | `'omit'` strips reasoning item ids when replaying history (fixes some 400s). |

### RunConfig (constructor arg to `new Runner(config)`)

`model`, `modelProvider`, `modelSettings` (override per-agent), `handoffInputFilter`, `inputGuardrails`, `outputGuardrails`, `tracingDisabled`, `traceIncludeSensitiveData`, `workflowName`, `traceId`, `groupId`, `traceMetadata`, `tracing`, plus defaults for the per-run hooks above. Runner-level `modelSettings` override agent-level; nested `reasoning`/`text`/`retry` objects are deep-merged.

## RunResult

| Field | Use |
| --- | --- |
| `finalOutput` | `string` (no outputType) / `z.infer<Schema>` / `unknown` (raw JSON schema) / `undefined` (paused or cancelled). |
| `history` | `AgentInputItem[]` = input + new items. Pass as next turn's input for manual chat loops. |
| `output` | Only the new model-shaped items from this run. |
| `newItems` | Rich `RunItem`s with agent/tool/handoff metadata: `RunMessageOutputItem`, `RunToolCallItem`, `RunToolCallOutputItem`, `RunToolApprovalItem`, `RunHandoffCallItem`, `RunHandoffOutputItem`, `RunReasoningItem`, ... |
| `lastAgent` / `activeAgent` | Agent that produced the last output (use it for the next turn after handoffs). |
| `lastResponseId` | For `previousResponseId` chaining. |
| `interruptions` | Pending `RunToolApprovalItem[]` (HITL, see 11). |
| `state` | Serializable `RunState` snapshot to resume. `result.state.usage` has `requests`, `inputTokens`, `outputTokens`, `totalTokens`, `requestUsageEntries`. |
| `rawResponses` | Raw model responses (`requestId`, `providerData`, `rawUsage` if `preserveRawUsage`). |
| `inputGuardrailResults` / `outputGuardrailResults` / `toolInputGuardrailResults` / `toolOutputGuardrailResults` | Diagnostics. |
| `runContext` | `.context` (your DI object), `.usage`, `.toolInput`. |

### Manual multi-turn chat loop

```ts
import { Agent, run, user } from '@openai/agents';
import type { AgentInputItem } from '@openai/agents';

let thread: AgentInputItem[] = [];
async function userSays(text: string) {
  const result = await run(agent, thread.concat(user(text)));
  thread = result.history;
  return result.finalOutput;
}
```

## Errors (all extend `AgentsError`, may carry `.state`)

`MaxTurnsExceededError`, `ModelBehaviorError` (malformed JSON, unknown tool), `ModelRefusalError`, `ModelTimeoutError`, `InputGuardrailTripwireTriggered`, `OutputGuardrailTripwireTriggered`, `ToolInputGuardrailTripwireTriggered`, `ToolOutputGuardrailTripwireTriggered`, `GuardrailExecutionError`, `ToolTimeoutError`, `ToolCallError`, `UserError` (config/usage errors).

## Forcing tool use

```ts
new Agent({ ..., modelSettings: { toolChoice: 'required' } }); // 'auto' | 'required' | 'none' | '<tool_name>'
```

Combine with `toolUseBehavior: 'stop_on_first_tool'` to return the tool result directly as `finalOutput`. Keep `toolChoice: 'auto'` when using deferred tools / tool search.

## Composition patterns

- **Manager (agents as tools)**: `manager.tools = [specialist.asTool({ toolName, toolDescription })]`. Manager keeps control and summarizes.
- **Handoffs**: `Agent.create({ handoffs: [a, b] })`. Specialist takes over the conversation. Use `Agent.create` (not `new Agent`) so `finalOutput` is typed as the union of handoff targets' output types.
- **Code orchestration**: just call `run()` several times and wire outputs yourself (wrap in `withTrace()` to group).

## Config helpers (`@openai/agents`)

```ts
setDefaultOpenAIKey('sk-...');
setDefaultOpenAIClient(new OpenAI({ baseURL, apiKey }));   // openai >= 7.2
setOpenAIAPI('responses' | 'chat_completions');            // default 'responses'
setOpenAIResponsesTransport('http' | 'websocket');         // default 'http'
setDefaultModelProvider(provider);
setTracingDisabled(true); setTracingExportApiKey('sk-...');
setSensitiveDataLoggingEnabled(true);
getLogger('my-app').debug('...');                          // DEBUG=openai-agents:* for SDK logs
```
