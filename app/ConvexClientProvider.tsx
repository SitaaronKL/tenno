"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;

// Created once per module so the client does not reconnect on every render.
// Null when the deployment is not configured, so importing this file cannot throw.
const convex = url ? new ConvexReactClient(url) : null;

export function backendConfigured(): boolean {
  return convex !== null;
}

// A deployment with no NEXT_PUBLIC_CONVEX_URL should say so, not answer 500.
export function BackendNotConfigured() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-8">
      <div className="max-w-md space-y-2 text-center">
        <h1 className="text-lg font-medium">Backend not configured</h1>
        <p className="text-sm text-muted-foreground">
          Set NEXT_PUBLIC_CONVEX_URL in .env.local and restart. See the README for the setup steps.
        </p>
      </div>
    </div>
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) return <BackendNotConfigured />;
  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}
