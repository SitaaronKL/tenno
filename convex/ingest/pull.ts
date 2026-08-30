import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { normalize } from "./normalize";
import { vPlatform } from "../lib/validators";

const UPSTREAM = "https://api.warframestat.us";

export const pull = internalAction({
  args: { platform: vPlatform },
  returns: v.null(),
  handler: async (ctx, args) => {
    const response = await fetch(`${UPSTREAM}/${args.platform}?language=en`);
    if (!response.ok) {
      throw new Error(`world state fetch failed: ${response.status} ${response.statusText}`);
    }
    const raw = await response.json();
    // TODO: when state.stale is true, refetch https://api.warframe.com/cdn/worldState.php and normalize that instead.
    const state = normalize(raw, Date.now());
    await ctx.runMutation(internal.ingest.apply.apply, { platform: args.platform, state });
    return null;
  },
});
