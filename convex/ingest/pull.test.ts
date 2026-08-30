import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import de from "./__fixtures__/de.json";
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

function routes(handlers: { de: () => Response; warframestat: () => Response }) {
  vi.stubGlobal("fetch", (url: string) =>
    Promise.resolve(String(url).includes("warframe.com") ? handlers.de() : handlers.warframestat()),
  );
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

  test("says so when neither upstream answers", async () => {
    routes({
      de: () => new Response("no", { status: 500 }),
      warframestat: () => new Response("no", { status: 500 }),
    });
    const t = convexTest(schema, modules);
    await expect(t.action(internal.ingest.pull.pull, { platform: "pc" })).rejects.toThrow(
      /world state fetch failed/,
    );
  });
});
