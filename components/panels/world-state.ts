"use client";

import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import type { WorldState } from "@/lib/contracts/worldstate";

// convex/_generated is owned by slice 1 and may not exist yet, so name the query directly.
const get = makeFunctionReference<"query", { platform: "pc" }, WorldState | null>(
  "worldstate:get",
);

export function useWorldState(): WorldState | null | undefined {
  return useQuery(get, { platform: "pc" });
}
