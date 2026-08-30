"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { WorldState } from "@/lib/contracts/worldstate";

export function useWorldState(): WorldState | null | undefined {
  return useQuery(api.worldstate.get, { platform: "pc" }) as WorldState | null | undefined;
}
