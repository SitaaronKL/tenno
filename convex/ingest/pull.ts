import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { WorldState } from "../../lib/contracts/worldstate";
import { normalize } from "./normalize";
import { DE_ENDPOINT, normalizeDe } from "./de";
import { vPlatform } from "../lib/validators";

const WARFRAMESTAT = "https://api.warframestat.us";

async function json(url: string, source: string): Promise<Record<string, unknown>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`world state fetch failed: ${source} ${response.status} ${response.statusText}`);
  }
  // DE serves its JSON as text/html, so the body is parsed by hand either way.
  return JSON.parse(await response.text());
}

// DE is the source of truth and is seconds fresh. Warframestat parses the same feed but can lag
// by hours, so it is only worth reading when DE will not answer or answers with something else.
export const pull = internalAction({
  args: { platform: vPlatform },
  returns: v.null(),
  handler: async (ctx, args) => {
    let state: WorldState;
    try {
      state = normalizeDe(await json(DE_ENDPOINT, "de"), Date.now());
    } catch (error) {
      console.warn(`DE world state unavailable, falling back to warframestat: ${error}`);
      const raw = await json(`${WARFRAMESTAT}/${args.platform}?language=en`, "warframestat");
      state = normalize(raw, Date.now());
    }
    await ctx.runMutation(internal.ingest.apply.apply, { platform: args.platform, state });
    // worldstate.get carries no clock, so expiry is applied here, right after the write.
    await ctx.runMutation(internal.ingest.prune.prune, { platform: args.platform });
    return null;
  },
});
