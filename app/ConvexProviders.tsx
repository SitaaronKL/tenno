import type { ReactNode } from "react";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { BackendNotConfigured, ConvexClientProvider } from "./ConvexClientProvider";

// Both the server and the browser half read NEXT_PUBLIC_CONVEX_URL and throw without it, so a
// deployment that was never configured says so on the page instead of answering 500.
export function ConvexProviders({ children }: { children: ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return <BackendNotConfigured />;
  return (
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ConvexAuthNextjsServerProvider>
  );
}
