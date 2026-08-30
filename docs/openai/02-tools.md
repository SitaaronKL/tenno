# Tools

Categories: (1) hosted OpenAI tools, (2) built-in execution tools (computer/shell/apply_patch), (3) function tools, (4) agents as tools, (5) MCP servers, (6) sandbox tools, (7) experimental Codex tool.

## 1. Function tools with zod (`tool()`)

```ts
import { tool } from '@openai/agents';
import { z } from 'zod';

const getWeather = tool({
  name: 'get_weather',                     // optional; defaults to function name
  description: 'Get the weather for a given city',   // required, shown to the model
  parameters: z.object({
    city: z.string().describe('City name'),
    units: z.enum(['C', 'F']).nullable(),  // prefer .nullable() over .optional() (strict schema)
  }),
  async execute({ city, units }, runContext, details) {
    // runContext?.context = your DI object; details = { toolCall, signal, resumeState, ... }
    return { city, tempC: 21 };            // non-string results are JSON-serialized for the model
  },
});
```

### `tool()` options

| Field | Notes |
| --- | --- |
| `parameters` | zod object / Standard Schema / raw JSON Schema. Validation schemas enable **strict** mode automatically. |
| `strict` | Default `true`: invalid args -> error returned to model. `false` only sensible with raw JSON schema (`additionalProperties: true`). |
| `execute` | `(args, context?, details?) => unknown \| Promise<unknown>`. |
| `errorFunction` | `(context, error, details) => result` converts thrown errors into model-visible text (default: returns an error string; disabled when `outputSchema` set). |
| `timeoutMs` / `timeoutBehavior` | `'error_as_result'` (default) or `'raise_exception'` (`ToolTimeoutError`). Timeouts abort `details.signal`. |
| `needsApproval` | `true` or `async (context, args) => boolean` -> pauses run with `interruptions` (see 11). |
| `isEnabled` | `boolean` or `(ctx) => boolean` — hide the tool for a run. Runs before args exist, so not for arg-level auth. |
| `inputGuardrails` / `outputGuardrails` | Tool guardrails (see 05). |
| `outputSchema` | Responses-only. zod schema constrains `execute` return type + validates result (`InvalidToolOutputError`). |
| `allowedCallers` | `['direct']` (default) / `['programmatic']` / both — for Programmatic Tool Calling. |
| `deferLoading` | Responses-only: tool definition loaded on demand via `toolSearchTool()`. |
| `customDataExtractor` | Attach SDK-only metadata to `RunToolCallOutputItem.customData` (not sent to model). |

Non-strict raw JSON schema example:

```ts
const looseTool = tool({
  description: 'Echo input; be forgiving about typos',
  strict: false,
  parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: true },
  execute: async (input) => (input as { text?: string }).text ?? 'Invalid input',
});
```

Best practices: short explicit descriptions (what + when), one responsibility per tool, validate with zod, do not throw from `errorFunction`.

Tool execution: all function tool calls in a turn run concurrently unless `run(..., { toolExecution: { maxFunctionToolConcurrency: n } })`.

## 2. Hosted tools (Responses API only)

```ts
import { Agent, webSearchTool, fileSearchTool, codeInterpreterTool, imageGenerationTool, hostedMcpTool } from '@openai/agents';

const agent = new Agent({
  name: 'Travel assistant',
  tools: [
    webSearchTool({ searchContextSize: 'medium', userLocation: { type: 'approximate', city: 'Tokyo' }, filters: { allowedDomains: ['example.com'] } }),
    fileSearchTool('vs_123', { maxNumResults: 3, includeSearchResults: true }),
    codeInterpreterTool(),                      // auto-managed container by default
    imageGenerationTool({ size: '1024x1024' }),
    hostedMcpTool({ serverLabel: 'deepwiki', serverUrl: 'https://mcp.deepwiki.com/mcp', requireApproval: 'never' }),
  ],
});
```

Type strings: `web_search`, `file_search`, `code_interpreter`, `image_generation`, `tool_search`, `programmatic_tool_calling`. Hosted tools always return to the model (`toolUseBehavior` does not apply). Pricing: web search $10/1k calls, file search $2.50/1k calls + $0.10/GB/day storage (1 GB free), code interpreter per session.

## 3. Agents as tools

```ts
const summarizer = new Agent({ name: 'Summarizer', instructions: 'Summarize concisely.' });

const mainAgent = new Agent({
  name: 'Research assistant',
  tools: [
    summarizer.asTool({
      toolName: 'summarize_text',
      toolDescription: 'Generate a concise summary of the supplied text.',
      // optional:
      // parameters: z.object({...}), inputBuilder: ({ params }) => 'prompt', customOutputExtractor: (result) => string,
      // needsApproval, isEnabled, runConfig, runOptions, onStream: (event) => {}
    }),
  ],
});
```

Default schema is `{ input: string }`; runs a nested `Runner`; returns last message (or `customOutputExtractor(result)` where `result.agentToolInvocation` = `{ toolName, toolCallId, toolArguments }`). Providing `onStream`/`on(...)` makes the nested run stream. Approvals inside nested agents surface on the outer run's `interruptions`.

## 4. MCP servers

```ts
import { Agent, MCPServerStdio, MCPServerStreamableHttp, createMCPToolStaticFilter } from '@openai/agents';

const fs = new MCPServerStdio({ fullCommand: 'npx -y @modelcontextprotocol/server-filesystem ./files', cacheToolsList: true });
const remote = new MCPServerStreamableHttp({
  url: 'https://mcp.example.com/mcp', name: 'Example', cacheToolsList: true,
  toolFilter: createMCPToolStaticFilter({ allowed: ['safe_tool'], blocked: ['dangerous_tool'] }),
});

await fs.connect(); await remote.connect();
try {
  const agent = new Agent({ name: 'MCP agent', mcpServers: [fs, remote], mcpConfig: { /* strict schemas, error handling, server-prefixed names */ } });
  await run(agent, '...');
} finally {
  await fs.close(); await remote.close();
}
```

Three flavors: hosted (`hostedMcpTool`, runs on OpenAI servers, supports `requireApproval` + `onApproval`), Streamable HTTP (`MCPServerStreamableHttp`), stdio (`MCPServerStdio`, Node only). `connectMcpServers()` helps manage many servers. Stdio servers are not usable in serverless/edge.

## 5. Built-in execution tools (brief)

`computerTool({ computer })` (implement `Computer`; use `gpt-5.4`+ for GA `computer` tool; `needsApproval`, `onSafetyCheck`), `shellTool({ shell })` local or `shellTool({ environment: { type: 'container_auto' } })` hosted, `applyPatchTool({ editor })`. All support `needsApproval`; local ones support `onApproval` for programmatic decisions.

## 6. Tool search / deferred loading (Responses, GPT-5.4+; tool search GPT-5.6 Sol+)

```ts
import { Agent, tool, toolNamespace, toolSearchTool } from '@openai/agents';

const shippingLookup = tool({ name: 'get_shipping_eta', description: '...', parameters: p, deferLoading: true, execute });
const crmTools = toolNamespace({ name: 'crm', description: 'CRM tools', tools: [tool({ ..., deferLoading: true, execute })] });

const agent = new Agent({ name: 'Ops', model: 'gpt-5.6', tools: [shippingLookup, ...crmTools, toolSearchTool()] });
```

Keep `toolChoice: 'auto'`; not supported on Chat Completions or the AI SDK adapter.

## 7. Programmatic Tool Calling (GPT-5.6, Responses only)

Model writes JS in a hosted runtime that calls your tools; your app still executes them.

```ts
import { Agent, programmaticToolCallingTool, tool } from '@openai/agents';

const getInventory = tool({
  name: 'get_inventory', description: 'Return inventory for a SKU.',
  parameters: z.object({ sku: z.string() }),
  allowedCallers: ['programmatic'],                 // or ['direct', 'programmatic']
  outputSchema: z.object({ sku: z.string(), availableUnits: z.number() }),
  async execute({ sku }) { return { sku, availableUnits: 42 }; },
});

const agent = new Agent({ name: 'Planner', model: 'gpt-5.6', tools: [getInventory, programmaticToolCallingTool()] });
```

Use for bounded, tool-heavy stages (filter/join/aggregate many results). Prefer direct calls when each result changes the model's next decision or an action needs approval.

## Raw Responses API tool definition (for comparison)

```ts
const tools: OpenAI.Responses.Tool[] = [{
  type: 'function', name: 'get_horoscope', description: "Get today's horoscope for a sign.",
  parameters: { type: 'object', properties: { sign: { type: 'string' } }, required: ['sign'], additionalProperties: false },
  strict: true,
}];
```

Note the Responses shape is flat (`type, name, parameters` at top level) unlike Chat Completions' `{ type: 'function', function: {...} }`. See 10 for the full loop.
