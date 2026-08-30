import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The landing page and the login page must render on a checkout that was never configured.
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("with no NEXT_PUBLIC_CONVEX_URL", () => {
  it("says the backend is not configured instead of throwing", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
    vi.resetModules();
    const { ConvexClientProvider } = await import("../ConvexClientProvider");

    render(<ConvexClientProvider>{<p>signed in area</p>}</ConvexClientProvider>);

    expect(screen.getByText("Backend not configured")).toBeInTheDocument();
    expect(screen.queryByText("signed in area")).not.toBeInTheDocument();
  });

  it("mounts the app normally once the url is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
    vi.resetModules();
    const { backendConfigured } = await import("../ConvexClientProvider");

    expect(backendConfigured()).toBe(true);
  });
});
