import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import cycleRaw from "./__fixtures__/bounty-cycle.json";
import de from "./__fixtures__/de.json";

const cycle = cycleRaw as { expiry: number };
import warframestat from "./__fixtures__/pc.json";
import schema from "../schema";
import { internal } from "../_generated/api";

// convex-test wants paths relative to the convex root, this test sits one directory down.
const modules = Object.fromEntries(
  Object.entries(import.meta.glob("../**/*.ts")).map(([path, load]) => [
    path.startsWith("../") ? path.replace("../", "./") : path.replace("./", "./ingest/"),
    load,
  ]),
);

// DE serves JSON as text/html, warframestat serves real JSON.
function respond(body: unknown, type = "text/html") {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status: 200,
    headers: { "content-type": type },
  });
}

// browse.wf's oracle is the third upstream, it carries the fixed board rotation and nothing else.
function routes(handlers: {
  de: () => Response;
  warframestat: () => Response;
  cycle?: () => Response;
}) {
  vi.stubGlobal("fetch", (url: string) => {
    const at = String(url);
    if (at.includes("browse.wf")) {
      return Promise.resolve((handlers.cycle ?? (() => respond(cycle, "application/json")))());
    }
    return Promise.resolve(at.includes("warframe.com") ? handlers.de() : handlers.warframestat());
  });
}

async function storedSource(t: ReturnType<typeof convexTest>) {
  const row = await t.run(async (ctx) => await ctx.db.query("worldState").unique());
  return row!.data;
}

// The fixtures are a snapshot of 2026-08-30, prune drops them against a real clock.
const INSIDE_FIXTURE_WINDOW = Date.parse("2026-08-30T01:17:00.000Z");

beforeEach(() => vi.setSystemTime(INSIDE_FIXTURE_WINDOW));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("pull", () => {
  test("takes the world state straight from DE", async () => {
    routes({
      de: () => respond(de),
      warframestat: () => respond(warframestat, "application/json"),
    });
    const t = convexTest(schema, modules);
    await t.action(internal.ingest.pull.pull, { platform: "pc" });

    const state = await storedSource(t);
    expect(state.source).toBe("de");
    expect(state.fissures).toHaveLength(35);
  });

  test("falls back to warframestat when DE will not answer", async () => {
    routes({
      de: () => new Response("gateway timeout", { status: 504 }),
      warframestat: () => respond(warframestat, "application/json"),
    });
    const t = convexTest(schema, modules);
    await t.action(internal.ingest.pull.pull, { platform: "pc" });

    const state = await storedSource(t);
    expect(state.source).toBe("warframestat");
    expect(state.fissures.length).toBeGreaterThan(0);
  });

  test("falls back to warframestat when DE answers with something that is not JSON", async () => {
    routes({
      de: () => respond("<html>under maintenance</html>"),
      warframestat: () => respond(warframestat, "application/json"),
    });
    const t = convexTest(schema, modules);
    await t.action(internal.ingest.pull.pull, { platform: "pc" });

    expect((await storedSource(t)).source).toBe("warframestat");
  });

  test("keeps the dashboard it had when neither upstream answers", async () => {
    routes({
      de: () => respond(de),
      warframestat: () => respond(warframestat, "application/json"),
    });
    const t = convexTest(schema, modules);
    await t.action(internal.ingest.pull.pull, { platform: "pc" });
    const good = await storedSource(t);

    routes({
      de: () => new Response("no", { status: 500 }),
      warframestat: () => new Response("no", { status: 500 }),
    });
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await t.action(internal.ingest.pull.pull, { platform: "pc" });
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("keeping the last snapshot"));
    logged.mockRestore();

    expect((await storedSource(t)).fissures).toHaveLength(good.fissures.length);
  });
});

describe("a 200 that is not world state", () => {
  test("falls back to warframestat when DE answers 200 with an error envelope", async () => {
    routes({
      de: () => respond({ error: "rate limited" }),
      warframestat: () => respond(warframestat, "application/json"),
    });
    const t = convexTest(schema, modules);
    await t.action(internal.ingest.pull.pull, { platform: "pc" });

    const state = await storedSource(t);
    expect(state.source).toBe("warframestat");
    expect(state.fissures.length).toBeGreaterThan(0);
  });

  test("keeps the last good snapshot when both upstreams answer 200 with nothing", async () => {
    routes({
      de: () => respond(de),
      warframestat: () => respond(warframestat, "application/json"),
    });
    const t = convexTest(schema, modules);
    await t.action(internal.ingest.pull.pull, { platform: "pc" });
    const good = await storedSource(t);
    expect(good.fissures.length).toBeGreaterThan(0);

    routes({
      de: () => respond({ error: "rate limited" }),
      warframestat: () => respond({ message: "WorldState Not Found" }, "application/json"),
    });
    await t.action(internal.ingest.pull.pull, { platform: "pc" });

    // The dashboard keeps showing what it had rather than going blank.
    const after = await storedSource(t);
    expect(after.fissures.map((f: { key: string }) => f.key)).toEqual(
      good.fissures.map((f: { key: string }) => f.key),
    );
  });

  test("asks both upstreams as a browser would, they refuse a bare fetch", async () => {
    const seen: string[] = [];
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      seen.push(headers.get("user-agent") ?? "");
      return Promise.resolve(
        String(url).includes("warframe.com")
          ? respond({ error: "rate limited" })
          : respond(warframestat, "application/json"),
      );
    });
    const t = convexTest(schema, modules);
    await t.action(internal.ingest.pull.pull, { platform: "pc" });

    // DE, warframestat and browse.wf's bounty cycle.
    expect(seen).toHaveLength(3);
    for (const agent of seen) expect(agent).toMatch(/Mozilla/);
  });

  test("prefers the upstream that is not hours behind", async () => {
    // DE answers, but its snapshot is a day old, warframestat is current.
    const stale = { ...(de as Record<string, unknown>), Time: Math.floor(INSIDE_FIXTURE_WINDOW / 1000) - 86_400 };
    routes({
      de: () => respond(stale),
      warframestat: () => respond(warframestat, "application/json"),
    });
    const t = convexTest(schema, modules);
    await t.action(internal.ingest.pull.pull, { platform: "pc" });

    expect((await storedSource(t)).source).toBe("warframestat");
  });
});

describe("the fixed board rotation", () => {
  const holdfasts = async (t: ReturnType<typeof convexTest>) =>
    (await storedSource(t)).bounties!.find((b: { syndicate: string }) => b.syndicate === "The Holdfasts")!;

  test("the Zariman board comes out with mission types, not Bounty", async () => {
    routes({ de: () => respond(de), warframestat: () => respond(warframestat, "application/json") });
    const t = convexTest(schema, modules);
    await t.action(internal.ingest.pull.pull, { platform: "pc" });

    const board = await holdfasts(t);
    expect(board.rotation).toBe("A");
    expect(board.expiresAt).toBe(cycle.expiry);
    expect(board.jobs.map((j: { missionType?: string }) => j.missionType)).toEqual([
      "Void Flood",
      "Mobile Defense",
      "Void Armageddon",
      "Extermination",
      "Void Cascade",
    ]);
    expect(board.jobs[0].challenge).toBe("Void Flood, complete waves");
  });

  test("their cache is respected, one fetch per rotation", async () => {
    let fetched = 0;
    routes({
      de: () => respond(de),
      warframestat: () => respond(warframestat, "application/json"),
      cycle: () => {
        fetched += 1;
        return respond(cycle, "application/json");
      },
    });
    const t = convexTest(schema, modules);
    await t.action(internal.ingest.pull.pull, { platform: "pc" });
    await t.action(internal.ingest.pull.pull, { platform: "pc" });

    expect(fetched).toBe(1);
    expect((await holdfasts(t)).rotation).toBe("A");
  });

  test("the oracle going down leaves the drop table board alone", async () => {
    routes({
      de: () => respond(de),
      warframestat: () => respond(warframestat, "application/json"),
      cycle: () => new Response("down", { status: 502 }),
    });
    const t = convexTest(schema, modules);
    await t.action(internal.ingest.pull.pull, { platform: "pc" });

    const board = await holdfasts(t);
    expect(board.rotation).toBeUndefined();
    expect(board.jobs[0].missionType).toBeUndefined();
    expect(board.jobs).toHaveLength(5);
  });
});
