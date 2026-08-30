"use client";

// Placeholder until convex/_generated exists, swap the body for useQuery(api.profiles.me).
export type Me = {
  email?: string;
  name?: string;
  image?: string;
} | null;

export function useMe(): Me | undefined {
  return null;
}
