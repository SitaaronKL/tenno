"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export type Me = {
  email?: string;
  name?: string;
  image?: string;
} | null;

export function useMe(): Me | undefined {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.profiles.me, isAuthenticated ? {} : "skip");
  if (isLoading) return undefined;
  if (!isAuthenticated) return null;
  if (me === undefined) return undefined;
  return {
    email: me.user.email ?? undefined,
    name: me.user.name ?? undefined,
    image: me.user.image ?? undefined,
  };
}
