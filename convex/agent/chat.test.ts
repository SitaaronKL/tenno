import { describe, expect, test, vi } from "vitest";

// The suite is about who may send and how often, not about what the model answers.
vi.mock("../agent/index", async (importOriginal) => {
  const original = await importOriginal<typeof import("./index")>();
  return {
    ...original,
    tenno: { ...original.tenno, generateText: async () => ({ text: "ok" }) },
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
    await expect(t.mutation(api.agent.chat.startThread, {})).rejects.toThrow();
  });

  test("one user keeps one conversation, another user gets their own", async () => {
    const t = setup();
    const asAsh = t.withIdentity({ subject: "ash|session" });
    const asVolt = t.withIdentity({ subject: "volt|session" });

    const first = await asAsh.mutation(api.agent.chat.startThread, {});
    const again = await asAsh.mutation(api.agent.chat.startThread, {});
    const other = await asVolt.mutation(api.agent.chat.startThread, {});

    expect(again).toBe(first);
    expect(other).not.toBe(first);
    await expect(
      asAsh.query(api.agent.chat.listMessages, {
        threadId: first,
        paginationOpts: { cursor: null, numItems: 50 },
      }),
    ).resolves.toMatchObject({ page: [] });
  });

  test("a user cannot read another user's messages", async () => {
    const t = setup();
    const asAsh = t.withIdentity({ subject: "ash|session" });
    const asVolt = t.withIdentity({ subject: "volt|session" });
    const ashThread = await asAsh.mutation(api.agent.chat.startThread, {});
    await expect(
      asVolt.query(api.agent.chat.listMessages, {
        threadId: ashThread,
        paginationOpts: { cursor: null, numItems: 50 },
      }),
    ).rejects.toThrow();
  });
});

describe("what one account may spend on the model", () => {
  test("the twenty first chat message in an hour is refused, kindly", async () => {
    const t = setup();
    rateLimiter.register(t);
    const asAsh = t.withIdentity({ subject: "ash|session" });
    const threadId = await asAsh.mutation(api.agent.chat.startThread, {});

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
    const ashThread = await asAsh.mutation(api.agent.chat.startThread, {});
    for (let i = 0; i < 20; i++) {
      await asAsh.action(api.agent.chat.sendMessage, { threadId: ashThread, text: `q${i}` });
    }

    const voltThread = await asVolt.mutation(api.agent.chat.startThread, {});
    await expect(
      asVolt.action(api.agent.chat.sendMessage, { threadId: voltThread, text: "hello" }),
    ).resolves.toBe(null);
  });
});
