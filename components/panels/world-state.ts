"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { WorldState } from "@/lib/contracts/worldstate";

// The snapshot only moves when the game does, freshness rides a tiny query of its own,
// and the merge means panels still read one object.
export function useWorldState(): WorldState | null | undefined {
  const state = useQuery(api.worldstate.get, { platform: "pc" }) as WorldState | null | undefined;
  const meta = useQuery(api.worldstate.meta, { platform: "pc" });
  if (!state) return state;
  return meta ? { ...state, ...meta } : state;
}
