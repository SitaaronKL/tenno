import { createThread, getThreadMetadata, listUIMessages, saveMessage } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { action, internalAction, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireUser } from "../lib/auth";
import { agentComponent, tenno } from "./index";
import { checkLimit } from "./limits";

type Ctx = Parameters<typeof getThreadMetadata>[0];

// Threads belong to one user, so every entry point checks the owner itself.
async function requireThread(ctx: Ctx, threadId: string, userId: string) {
  const thread = await getThreadMetadata(ctx, agentComponent, { threadId });
  if (thread.userId !== userId) throw new Error("Thread not found");
  return thread;
}

// The page opens on a fresh chat, so a thread only exists once something was said.
export const newThread = mutation({
  args: { title: v.optional(v.string()) },
  returns: v.string(),
  handler: async (ctx, { title }): Promise<string> => {
    const { userId } = await requireUser(ctx);
    return await createThread(ctx, agentComponent, {
      userId,
      title: title?.trim() || "Voidwatch chat",
    });
  },
});

export const listThreads = query({
  args: {},
  returns: v.array(v.object({ id: v.string(), title: v.string(), createdAt: v.number() })),
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const result = await ctx.runQuery(agentComponent.threads.listThreadsByUserId, {
      userId,
      order: "desc",
      paginationOpts: { cursor: null, numItems: 30 },
    });
    return result.page.map((thread) => ({
      id: thread._id,
      title: thread.title ?? "Voidwatch chat",
      createdAt: thread._creationTime,
    }));
  },
});

export const sendMessage = action({
  args: { threadId: v.string(), text: v.string() },
  returns: v.null(),
  handler: async (ctx, { threadId, text }): Promise<null> => {
    const { userId } = await requireUser(ctx);
    await requireThread(ctx, threadId, userId);
    await checkLimit(
      ctx,
      "chatMessages",
      userId,
      "That is too many messages this hour. Try again a little later.",
    );
    const { messageId } = await saveMessage(ctx, agentComponent, {
      threadId,
      userId,
      prompt: text,
    });
    await tenno.generateText(ctx, { threadId, userId }, { promptMessageId: messageId });
    return null;
  },
});

// Paginated: the component answers newest first, so a long thread loads a page at a time
// and the client reverses each page for display.
export const listMessages = query({
  args: { threadId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(
      v.object({ key: v.string(), role: v.string(), text: v.string(), status: v.string() }),
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { threadId, paginationOpts }) => {
    const { userId } = await requireUser(ctx);
    await requireThread(ctx, threadId, userId);
    const result = await listUIMessages(ctx, agentComponent, { threadId, paginationOpts });
    return {
      page: result.page
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ key: m.key, role: m.role, text: m.text, status: m.status })),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

const LINK_FIRST =
  "I do not know this number yet. Add it under Settings in Voidwatch, then text me again.";

// Inbound iMessage has no session, the verified phone says which user the agent acts for.
export const replyToInbound = internalAction({
  args: { phone: v.string(), text: v.string() },
  returns: v.string(),
  handler: async (ctx, { phone, text }): Promise<string> => {
    const linked = await ctx.runQuery(internal.profiles.photonThread, { phone });
    if (!linked) return LINK_FIRST;
    let threadId = linked.threadId;
    if (!threadId) {
      threadId = await createThread(ctx, agentComponent, {
        userId: linked.userId,
        title: `Voidwatch iMessage ${phone}`,
      });
      await ctx.runMutation(internal.profiles.storePhotonThreadId, { phone, threadId });
    }
    const result = await tenno.generateText(ctx, { threadId, userId: linked.userId }, { prompt: text });
    return result.text;
  },
});
