"use client";

import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ModDef } from "@/lib/builds/capacity";
import type { BuildItem, BuildRow } from "./types";

// The whole mod table is about half a megabyte, so the editor asks for it once and filters locally.
const EVERY_MOD = { limit: 5000 };

export function useBuildCatalog(): { items: BuildItem[]; mods: ModDef[]; ready: boolean } {
  const { isAuthenticated } = useConvexAuth();
  const items = useQuery(api.builds.items, isAuthenticated ? {} : "skip");
  const mods = useQuery(api.mods.search, isAuthenticated ? EVERY_MOD : "skip");
  return {
    items: (items ?? []) as BuildItem[],
    mods: (mods ?? []) as ModDef[],
    ready: items !== undefined && mods !== undefined,
  };
}

export function useMyBuilds(): BuildRow[] | undefined {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.builds.list, isAuthenticated ? {} : "skip") as BuildRow[] | undefined;
}

export function useBuild(id: string | undefined): BuildRow | null | undefined {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.builds.get,
    isAuthenticated && id ? { id: id as Id<"builds"> } : "skip",
  ) as BuildRow | null | undefined;
}

export const useCreateBuild = () => useMutation(api.builds.create);
export const useUpdateBuild = () => useMutation(api.builds.update);
export const useRemoveBuild = () => useMutation(api.builds.remove);
export const useForkBuild = () => useMutation(api.builds.fork);
export const useDraftBuild = () => useAction(api.agent.buildDrafter.draft);
