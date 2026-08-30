# Handoffs

A handoff delegates the **whole conversation** to another agent. To the model a handoff is a tool named `transfer_to_<agent_name_snake>`. Handoffs stay within a single `run()`; `result.lastAgent` tells you who ended up answering (reuse it for the next turn).

Choose handoffs when the specialist should take over; choose `agent.asTool()` (see 02) when the original agent should stay in control and summarize.

## Basic

```ts
import { Agent, handoff } from '@openai/agents';

const billingAgent = new Agent({
  name: 'Billing agent',
  instructions: 'Handle billing questions.',
  handoffDescription: 'Billing, invoices, payment methods',   // appended to the tool description
});
const refundAgent = new Agent({ name: 'Refund agent', instructions: 'Process refunds.' });

// Use Agent.create so finalOutput is typed as the union across handoff targets
const triageAgent = Agent.create({
  name: 'Triage agent',
  instructions: 'Route the user to the right specialist.',
  handoffs: [billingAgent, handoff(refundAgent)],
});
```

## `handoff(agent, options)`

| Option | Purpose |
| --- | --- |
| `toolNameOverride` | Replace `transfer_to_<name>`. |
| `toolDescriptionOverride` | Replace the generated description. |
| `inputType` | zod/Standard/JSON schema for arguments the model attaches to the handoff call. |
| `onHandoff(runContext, input?)` | Callback when the handoff happens (log, persist, authorize — throw to abort). |
| `inputFilter(HandoffInputData) => HandoffInputData` | Change the history the next agent sees. |
| `isEnabled` | boolean or predicate; evaluated before the model runs (can't see args). |

```ts
import { z } from 'zod';
import { Agent, handoff, RunContext } from '@openai/agents';
import { removeAllTools, RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';

const EscalationData = z.object({ reason: z.string(), priority: z.enum(['low', 'high']) });

const escalationAgent = new Agent({
  name: 'Escalation agent',
  instructions: `${RECOMMENDED_PROMPT_PREFIX}\nHandle escalated cases carefully.`,
});

const escalate = handoff(escalationAgent, {
  inputType: EscalationData,
  onHandoff: async (ctx: RunContext, input) => {
    console.log('Escalating:', input?.reason, input?.priority);
  },
  inputFilter: removeAllTools,   // strip tool call/output items from the history passed on
  toolNameOverride: 'escalate_to_human_team',
});

const triage = Agent.create({ name: 'Triage', instructions: RECOMMENDED_PROMPT_PREFIX + ' Route requests.', handoffs: [escalate] });
```

### `inputFilter` payload (`HandoffInputData`)

- `inputHistory` — input before the run started
- `preHandoffItems` — items generated earlier in this run
- `newItems` — items from the current turn (includes the handoff call/output)
- `runContext`

Runner-level `handoffInputFilter` in `RunConfig` applies when a handoff has none of its own.

## Notes

- `inputType` is routing metadata the *model* decides (`reason`, `language`, `priority`). Put app state in `context`, not `inputType`. One handoff per destination; `inputType` does not dispatch between targets.
- Input guardrails still only run on the first agent; output guardrails only on the agent producing the final output. Use tool guardrails for per-tool checks inside a handoff chain. Tool guardrails do **not** apply to handoff calls.
- `RECOMMENDED_PROMPT_PREFIX` (from `@openai/agents-core/extensions`) explains handoffs to the model; prepend it to instructions of agents in a handoff graph for reliability.
- Streaming emits `run_item_stream_event` with `name: 'handoff_requested'` then `'handoff_occurred'`, and `agent_updated_stream_event` with the new agent.
- Do not combine SDK handoffs with the experimental hosted multi-agent model.
