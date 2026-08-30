# `@convex-dev/agent` (0.7.1)

AI agents on Convex: persistent threads/messages, streaming deltas over Convex's reactive queries, tool calling,
hybrid vector/text context search, file handling, usage tracking. Built on the Vercel AI SDK (`ai` v5 APIs:
`languageModel`, `stopWhen`, `stepCountIs`). Docs: https://docs.convex.dev/agents

## Setup
```sh
npm install @convex-dev/agent ai @ai-sdk/openai   # or @ai-sdk/anthropic etc.
```
```ts
// convex/convex.config.ts
import agent from "@convex-dev/agent/convex.config.js";
app.use(agent);
```
```ts
// convex/agents.ts
import { Agent, createTool } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { stepCountIs } from "ai";
import { z } from "zod";

export const ideaSearch = createTool({
  description: "Search ideas in the database",
  args: z.object({ query: z.string().describe("search text") }),
  handler: async (ctx, { query }) => {          // ctx: ToolCtx { runQuery, runMutation, runAction, userId, threadId, messageId, agent }
    return await ctx.runQuery(internal.ideas.search, { query });
  },
});

export const supportAgent = new Agent(components.agent, {
  name: "Support",
  languageModel: openai.chat("gpt-4o-mini"),
  instructions: "You are a helpful support agent.",
  tools: { ideaSearch },
  stopWhen: stepCountIs(5),                     // max tool-call rounds
  textEmbeddingModel: openai.embedding("text-embedding-3-small"), // enables vector context search
  contextOptions: { recentMessages: 20, searchOptions: { limit: 10, textSearch: true, vectorSearch: true } },
  usageHandler: async (ctx, { userId, model, provider, usage }) => { /* record tokens */ },
});
```

## Threads & generation
```ts
import { createThread, saveMessage, listUIMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";

export const startThread = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return await createThread(ctx, components.agent, { userId, title: "Support chat" });
  },
});

// Recommended async pattern: save user message in a mutation, generate in a scheduled action.
export const sendMessage = mutation({
  args: { threadId: v.string(), prompt: v.string() },
  handler: async (ctx, { threadId, prompt }) => {
    await authorizeThreadAccess(ctx, threadId);
    const { messageId } = await saveMessage(ctx, components.agent, { threadId, prompt });
    await ctx.scheduler.runAfter(0, internal.agents.generate, { threadId, promptMessageId: messageId });
  },
});

export const generate = internalAction({
  args: { threadId: v.string(), promptMessageId: v.string() },
  handler: async (ctx, { threadId, promptMessageId }) => {
    const result = await supportAgent.streamText(
      ctx, { threadId }, { promptMessageId },
      { saveStreamDeltas: { chunking: "word", throttleMs: 250 } },
    );
    await result.consumeStream();
    // non-streaming: const { text } = await supportAgent.generateText(ctx, { threadId }, { prompt });
    // structured: await supportAgent.generateObject(ctx, { threadId }, { prompt, schema: z.object({...}) });
  },
});

export const listMessages = query({
  args: { threadId: v.string(), paginationOpts: paginationOptsValidator, streamArgs: vStreamArgs },
  handler: async (ctx, args) => {
    await authorizeThreadAccess(ctx, args.threadId);
    const paginated = await listUIMessages(ctx, components.agent, args);
    const streams = await syncStreams(ctx, components.agent, args);
    return { ...paginated, streams };
  },
});
```
Other APIs: `agent.continueThread(ctx, { threadId })` → `{ thread }` with `thread.generateText/streamText/getMetadata/updateMetadata`;
`components.agent.threads.listThreadsByUserId({ userId, paginationOpts })`; `agent.deleteThreadAsync/deleteThreadSync/deleteThreadsByUserId`;
`agent.saveMessage(ctx, { threadId, userId, prompt, metadata })`. Tools resolve as `callArgs.tools ?? thread.tools ?? agent.tools`.

## React
```tsx
import { useUIMessages, useSmoothText, optimisticallySendMessage } from "@convex-dev/agent/react";

const { results, status, loadMore } = useUIMessages(api.chat.listMessages, { threadId }, { initialNumItems: 20, stream: true });
const send = useMutation(api.chat.sendMessage).withOptimisticUpdate(optimisticallySendMessage(api.chat.listMessages));
// per message:
const [visibleText] = useSmoothText(message.text, { startStreaming: message.status === "streaming" });
```
Each UI message has `key`, `role`, `text`, `status` ("streaming" | "success" | "failed"), `parts` (tool calls etc.).

## Gotchas
- LLM calls happen in **actions**; use the mutation → scheduler → internalAction pattern so the client gets
  reactive updates and the request survives navigation.
- `streamText` without `saveStreamDeltas` only streams to the action caller; with it, deltas are written to the
  DB and any subscribed client sees them.
- Always authorize thread access in your own wrapper functions; component functions have no auth.
- Add explicit return-type annotations on functions that reference `internal.*` and the agent to avoid TS circularity.
- Playground: `npx @convex-dev/agent-playground` + export `definePlaygroundAPI` for inspecting threads.
- Rate limiting per user: combine with `@convex-dev/rate-limiter` (`llmTokens` bucket keyed by user).
