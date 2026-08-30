import { createThread, getThreadMetadata, listUIMessages, saveMessage } from "@convex-dev/agent";
import { v } from "convex/values";
import { action, internalAction, mutation, query } from "../_generated/server";
import { requireUser } from "../lib/auth";
import { agentComponent, tenno } from "./index";

type Ctx = Parameters<typeof getThreadMetadata>[0];

// Threads belong to one user, so every entry point checks the owner itself.
async function requireThread(ctx: Ctx, threadId: string, userId: string) {
  const thread = await getThreadMetadata(ctx, agentComponent, { threadId });
  if (thread.userId !== userId) throw new Error("Thread not found");
  return thread;
}

export const startThread = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    const { userId } = await requireUser(ctx);
    // One rolling chat per user, so reloading the page keeps the history.
    const existing = await ctx.runQuery(agentComponent.threads.listThreadsByUserId, {
      userId,
      order: "desc",
      paginationOpts: { cursor: null, numItems: 1 },
    });
    if (existing.page.length > 0) return existing.page[0]._id;
    return await createThread(ctx, agentComponent, { userId, title: "Voidwatch chat" });
  },
});

export const sendMessage = action({
  args: { threadId: v.string(), text: v.string() },
  returns: v.null(),
  handler: async (ctx, { threadId, text }): Promise<null> => {
    const { userId } = await requireUser(ctx);
    await requireThread(ctx, threadId, userId);
    const { messageId } = await saveMessage(ctx, agentComponent, {
      threadId,
      userId,
      prompt: text,
    });
    await tenno.generateText(ctx, { threadId, userId }, { promptMessageId: messageId });
    return null;
  },
});

export const listMessages = query({
  args: { threadId: v.string() },
  returns: v.array(
    v.object({ key: v.string(), role: v.string(), text: v.string(), status: v.string() }),
  ),
  handler: async (ctx, { threadId }) => {
    const { userId } = await requireUser(ctx);
    await requireThread(ctx, threadId, userId);
    const page = await listUIMessages(ctx, agentComponent, {
      threadId,
      paginationOpts: { cursor: null, numItems: 100 },
    });
    return page.page
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ key: m.key, role: m.role, text: m.text, status: m.status }));
  },
});

// Inbound iMessage has no signed in user, so the thread is keyed by the phone that texted us.
export const replyToInbound = internalAction({
  args: { phone: v.string(), text: v.string() },
  returns: v.string(),
  handler: async (ctx, { phone, text }): Promise<string> => {
    const userId = `phone:${phone}`;
    const existing = await ctx.runQuery(agentComponent.threads.listThreadsByUserId, {
      userId,
      order: "desc",
      paginationOpts: { cursor: null, numItems: 1 },
    });
    const threadId =
      existing.page.length > 0
        ? existing.page[0]._id
        : await createThread(ctx, agentComponent, { userId, title: `Voidwatch iMessage ${phone}` });
    const result = await tenno.generateText(ctx, { threadId, userId }, { prompt: text });
    return result.text;
  },
});
