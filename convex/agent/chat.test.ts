import { describe, expect, test, vi } from "vitest";

// The suite is about who may send and how often, not about what the model answers.
const genCalls = vi.hoisted(() => [] as { threadId: string }[]);
vi.mock("../agent/index", async (importOriginal) => {
  const original = await importOriginal<typeof import("./index")>();
  return {
    ...original,
    tenno: {
      ...original.tenno,
      generateText: async (_ctx: unknown, opts: { threadId: string }) => {
        genCalls.push(opts);
        return { text: "ok" };
      },
    },
  };
});
import { convexTest } from "convex-test";
import agentTest from "@convex-dev/agent/test";
import rateLimiter from "@convex-dev/rate-limiter/test";
import schema from "../schema";
import { api, internal } from "../_generated/api";

// convex-test wants paths relative to the convex root, this test sits one directory down.
const modules = Object.fromEntries(
  Object.entries(import.meta.glob("../**/*.ts")).map(([path, load]) => [
    path.startsWith("../") ? path.replace("../", "./") : path.replace("./", "./agent/"),
    load,
  ]),
);

function setup() {
  const t = convexTest(schema, modules);
  agentTest.register(t);
  return t;
}

describe("inbound iMessage", () => {
  test("a phone we do not know is told how to link it", async () => {
    const t = setup();
    const answer = await t.action(internal.agent.chat.replyToInbound, {
      phone: "+15550009999",
      text: "list my rules",
    });
    expect(answer).toContain("Settings");
  });
});

describe("chat threads", () => {
  test("a signed out visitor cannot start a chat", async () => {
    const t = setup();
    await expect(t.mutation(api.agent.chat.newThread, {})).rejects.toThrow();
  });

  test("every new chat is its own thread and history lists them newest first", async () => {
    const t = setup();
    const asAsh = t.withIdentity({ subject: "ash|session" });

    const first = await asAsh.mutation(api.agent.chat.newThread, { title: "any good fissures" });
    const second = await asAsh.mutation(api.agent.chat.newThread, {});

    expect(second).not.toBe(first);
    const threads = await asAsh.query(api.agent.chat.listThreads, {});
    expect(threads.map((thread) => thread.id)).toEqual([second, first]);
    expect(threads[1].title).toBe("any good fissures");
  });

  test("history is per user", async () => {
    const t = setup();
    const asAsh = t.withIdentity({ subject: "ash|session" });
    const asVolt = t.withIdentity({ subject: "volt|session" });

    await asAsh.mutation(api.agent.chat.newThread, {});

    await expect(asVolt.query(api.agent.chat.listThreads, {})).resolves.toEqual([]);
  });

  test("a user cannot read another user's messages", async () => {
    const t = setup();
    const asAsh = t.withIdentity({ subject: "ash|session" });
    const asVolt = t.withIdentity({ subject: "volt|session" });
    const ashThread = await asAsh.mutation(api.agent.chat.newThread, {});
    await expect(
      asVolt.query(api.agent.chat.listMessages, {
        threadId: ashThread,
        paginationOpts: { cursor: null, numItems: 50 },
      }),
    ).rejects.toThrow();
  });
});

describe("the iMessage thread", () => {
  test("inbound texts keep their own thread even after a new web chat", async () => {
    const t = setup();
    genCalls.length = 0;
    const userId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "tenno@example.com" });
      await ctx.db.insert("profiles", {
        userId,
        email: "tenno@example.com",
        phone: "+15550001234",
        phoneVerifiedAt: Date.now(),
        timezone: "UTC",
        digestHour: 9,
        platform: "pc" as const,
      });
      return userId;
    });

    await t.action(internal.agent.chat.replyToInbound, { phone: "+15550001234", text: "hi" });
    // A newer web chat must not steal the iMessage conversation.
    await t.withIdentity({ subject: `${userId}|session` }).mutation(api.agent.chat.newThread, {});
    await t.action(internal.agent.chat.replyToInbound, { phone: "+15550001234", text: "again" });

    expect(genCalls).toHaveLength(2);
    expect(genCalls[1].threadId).toBe(genCalls[0].threadId);
  });
});

describe("what one account may spend on the model", () => {
  test("the twenty first chat message in an hour is refused, kindly", async () => {
    const t = setup();
    rateLimiter.register(t);
    const asAsh = t.withIdentity({ subject: "ash|session" });
    const threadId = await asAsh.mutation(api.agent.chat.newThread, {});

    for (let i = 0; i < 20; i++) {
      await asAsh.action(api.agent.chat.sendMessage, { threadId, text: `question ${i}` });
    }
    await expect(
      asAsh.action(api.agent.chat.sendMessage, { threadId, text: "one too many" }),
    ).rejects.toThrow(/too many messages/i);
  });

  test("another account is not held back by the first one's hour", async () => {
    const t = setup();
    rateLimiter.register(t);
    const asAsh = t.withIdentity({ subject: "ash|session" });
    const asVolt = t.withIdentity({ subject: "volt|session" });
    const ashThread = await asAsh.mutation(api.agent.chat.newThread, {});
    for (let i = 0; i < 20; i++) {
      await asAsh.action(api.agent.chat.sendMessage, { threadId: ashThread, text: `q${i}` });
    }

    const voltThread = await asVolt.mutation(api.agent.chat.newThread, {});
    await expect(
      asVolt.action(api.agent.chat.sendMessage, { threadId: voltThread, text: "hello" }),
    ).resolves.toBe(null);
  });
});
