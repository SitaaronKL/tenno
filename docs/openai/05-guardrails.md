# Guardrails

Three families:

| Family | Runs | Attached to | Error on trip |
| --- | --- | --- | --- |
| Input guardrails | Once, on the initial user input, **only for the first agent** in the run | `agent.inputGuardrails` / `RunConfig.inputGuardrails` | `InputGuardrailTripwireTriggered` |
| Output guardrails | Once, on the final output, **only for the agent that produces it** | `agent.outputGuardrails` / `RunConfig.outputGuardrails` | `OutputGuardrailTripwireTriggered` |
| Tool guardrails | Every function-tool call (before / after `execute`) | `tool({ inputGuardrails, outputGuardrails })` | `ToolInputGuardrailTripwireTriggered` / `ToolOutputGuardrailTripwireTriggered` (or reject without throwing) |

A guardrail returns `{ tripwireTriggered: boolean, outputInfo?: any }`. Guardrail *execution* failures (exceptions) throw `GuardrailExecutionError` (carries `.state`).

## Input guardrail (LLM-as-judge pattern)

```ts
import { Agent, run, InputGuardrail, InputGuardrailTripwireTriggered } from '@openai/agents';
import { z } from 'zod';

const guardrailAgent = new Agent({
  name: 'Guardrail check',
  model: 'gpt-5.6-luna',
  instructions: 'Check if the user is asking you to do their math homework.',
  outputType: z.object({ isMathHomework: z.boolean(), reasoning: z.string() }),
});

const mathGuardrail: InputGuardrail = {
  name: 'Math Homework Guardrail',
  runInParallel: false,   // default true. false = block the main model until the check finishes (saves tokens, adds latency)
  execute: async ({ input, context }) => {
    const result = await run(guardrailAgent, input, { context });
    return { outputInfo: result.finalOutput, tripwireTriggered: result.finalOutput?.isMathHomework ?? false };
  },
};

const agent = new Agent({ name: 'Support', instructions: '...', inputGuardrails: [mathGuardrail] });

try {
  await run(agent, 'Solve 2x + 3 = 11');
} catch (e) {
  if (e instanceof InputGuardrailTripwireTriggered) { /* blocked; e.result has outputInfo */ }
  else throw e;
}
```

`runInParallel: true` (default) starts the guardrail concurrently with the model; if it trips later, tokens may already be spent and tools may have run.

## Output guardrail

```ts
import { OutputGuardrail, OutputGuardrailTripwireTriggered } from '@openai/agents';

const MessageOutput = z.object({ response: z.string() });

const noMath: OutputGuardrail<typeof MessageOutput> = {
  name: 'No math in answers',
  async execute({ agentOutput, context, details }) {
    // details?.modelResponse and generated items are available for deeper inspection
    return { tripwireTriggered: /\d+x\s*=/.test(agentOutput.response) };
  },
};

const agent = new Agent({ name: 'Support', instructions: '...', outputType: MessageOutput, outputGuardrails: [noMath] });
```

When `toolUseBehavior` makes a tool result the final output and the output guardrail trips, the SDK replaces the rejected output with `Output withheld by an output guardrail.` in state/history.

## Tool guardrails

```ts
import { tool, defineToolInputGuardrail, defineToolOutputGuardrail, ToolGuardrailFunctionOutputFactory } from '@openai/agents';

const blockSecrets = defineToolInputGuardrail({
  name: 'block_secrets',
  run: async ({ toolCall }) => {
    const args = JSON.parse(toolCall.arguments) as { text?: string };
    if (args.text?.includes('sk-')) return ToolGuardrailFunctionOutputFactory.rejectContent('Remove secrets before calling this tool.');
    return ToolGuardrailFunctionOutputFactory.allow();
  },
});

const redactOutput = defineToolOutputGuardrail({
  name: 'redact_output',
  run: async ({ output }) =>
    String(output ?? '').includes('sk-')
      ? ToolGuardrailFunctionOutputFactory.rejectContent('Output contained sensitive data.')
      : ToolGuardrailFunctionOutputFactory.allow(),
});

const classifyTool = tool({
  name: 'classify_text', description: 'Classify text.',
  parameters: z.object({ text: z.string() }),
  inputGuardrails: [blockSecrets],
  outputGuardrails: [redactOutput],
  execute: ({ text }) => `length:${text.length}`,
});
```

Behaviors: `allow`, `rejectContent(message)` (tool call skipped / output replaced, run continues), `throwException` (tripwire error, run halts). Tool guardrails do not apply to handoffs, hosted tools, computer/shell/apply_patch, or `agent.asTool()`.

With `needsApproval`, input tool guardrails run after approval by default; set `run(..., { toolExecution: { preApprovalInputGuardrails: true } })` to also run them before showing the approval request.

## Recovery

- Input guardrail retry: must start a **fresh run** (input guardrails don't re-run from a saved state).
- Output guardrail retry: `run(agent, error.state)` re-evaluates output guardrails without another model call.
- Results are available on `result.inputGuardrailResults`, `outputGuardrailResults`, `toolInputGuardrailResults`, `toolOutputGuardrailResults`.

## Cheap alternatives

- Use `omni-moderation-latest` (free) via `openai.moderations.create()` inside a guardrail for safety classification.
- Use `gpt-5.6-luna` / `gpt-5-nano` with `outputType` for fast classifier guardrails.
