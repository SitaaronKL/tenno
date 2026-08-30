"use client";

import { useAuthActions } from "@convex-dev/auth/react";

// The auth provider is absent during static prerender, fall back to no ops.
export function useAuth() {
  return (
    useAuthActions() ?? {
      signIn: async () => ({ signingIn: false }),
      signOut: async () => {},
    }
  );
}
