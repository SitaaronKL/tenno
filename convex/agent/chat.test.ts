import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import agentTest from "@convex-dev/agent/test";
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
    await expect(asAsh.query(api.agent.chat.listMessages, { threadId: first })).resolves.toEqual([]);
  });

  test("a user cannot read another user's messages", async () => {
    const t = setup();
    const asAsh = t.withIdentity({ subject: "ash|session" });
    const asVolt = t.withIdentity({ subject: "volt|session" });
    const ashThread = await asAsh.mutation(api.agent.chat.startThread, {});
    await expect(
      asVolt.query(api.agent.chat.listMessages, { threadId: ashThread }),
    ).rejects.toThrow();
  });
});
