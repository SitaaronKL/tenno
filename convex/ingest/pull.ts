import { v } from "convex/values";
import { internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import type { BountyCycle, WorldState } from "../../lib/contracts/worldstate";
import { normalize } from "./normalize";
import { DE_ENDPOINT, normalizeDe } from "./de";
import { BOUNTY_CYCLE_ENDPOINT, parseCycle, withBountyCycle } from "./bountyCycle";
import { vPlatform } from "../lib/validators";
import { bountyCycleValidator, worldStateValidator } from "../schema";

const WARFRAMESTAT = "https://api.warframestat.us";

// Both upstreams answer 403 or 404 to a bare fetch, they want to see a browser.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

async function json(url: string, source: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "application/json, text/plain, */*" },
  });
  if (!response.ok) {
    throw new Error(`world state fetch failed: ${source} ${response.status} ${response.statusText}`);
  }
  // DE serves its JSON as text/html, so the body is parsed by hand either way.
  return JSON.parse(await response.text());
}

// A 200 carrying an error envelope, a CDN challenge or a renamed schema parses fine and normalizes
// to nothing. Real world state always has fissures running or a sortie up, so an empty one is a lie.
function plausible(state: WorldState): boolean {
  return state.fissures.length > 0 || state.sortie !== null;
}

async function candidate(
  source: string,
  read: () => Promise<WorldState>,
): Promise<WorldState | null> {
  try {
    const state = await read();
    if (!plausible(state)) {
      console.warn(`${source} answered with no fissures and no sortie, treating it as no answer`);
      return null;
    }
    return state;
  } catch (error) {
    console.warn(`${source} world state unavailable: ${error}`);
    return null;
  }
}

// browse.wf caches the rotation for 2.5 hours and it only changes when the rotation does, so the
// stored one is reused until its own expiry passes. Their oracle is one server, never a hard failure.
export const bountyCycle = internalAction({
  args: { platform: vPlatform },
  returns: v.union(bountyCycleValidator, v.null()),
  handler: async (ctx, args): Promise<BountyCycle | null> => {
    const state: WorldState | null = await ctx.runQuery(internal.ingest.pull.snapshot, {
      platform: args.platform,
    });
    const held = state?.bountyCycle ?? null;
    if (held && held.expiry > Date.now()) return held;
    try {
      return parseCycle(await json(BOUNTY_CYCLE_ENDPOINT, "browse.wf"));
    } catch (error) {
      console.warn(`browse.wf bounty cycle unavailable: ${error}`);
      return held;
    }
  },
});

// The action cannot read the database itself, and the cycle is only worth refetching per rotation.
export const snapshot = internalQuery({
  args: { platform: vPlatform },
  returns: v.union(worldStateValidator, v.null()),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("worldState")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .unique();
    return row ? row.data : null;
  },
});

// DE is the source of truth and is seconds fresh. Warframestat parses the same feed but can lag
// by hours, so it is only worth reading when DE will not answer or answers with something else.
export const pull = internalAction({
  args: { platform: vPlatform },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const de = await candidate("DE", async () => normalizeDe(await json(DE_ENDPOINT, "de"), now));
    // A snapshot hours behind is worse than the other upstream, `stale` is the ten minute mark.
    let state = de && !de.stale ? de : null;
    if (!state) {
      const wfs = await candidate("warframestat", async () =>
        normalize(await json(`${WARFRAMESTAT}/${args.platform}?language=en`, "warframestat"), now),
      );
      state = wfs && !wfs.stale ? wfs : (wfs ?? de);
    }

    if (!state) {
      // Both upstreams are unusable. The stored snapshot is old news but it is still true.
      console.error("no upstream answered with plausible world state, keeping the last snapshot");
      return null;
    }

    // The fixed boards only get their real mission types once the rotation is in hand.
    const cycle = await ctx.runAction(internal.ingest.pull.bountyCycle, { platform: args.platform });
    state = withBountyCycle(state, cycle);

    await ctx.runMutation(internal.ingest.apply.apply, { platform: args.platform, state });
    // worldstate.get carries no clock, so expiry is applied here, right after the write.
    await ctx.runMutation(internal.ingest.prune.prune, { platform: args.platform });
    return null;
  },
});
