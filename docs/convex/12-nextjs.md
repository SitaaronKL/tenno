# Next.js Integration (App Router)

Packages: `convex` (`convex/react`, `convex/nextjs`), plus `@convex-dev/auth/nextjs` for Convex Auth or
`@clerk/nextjs` + `convex/react-clerk` for Clerk. Env: `NEXT_PUBLIC_CONVEX_URL` (`.convex.cloud`) and, for HTTP
actions / OAuth, `NEXT_PUBLIC_CONVEX_SITE_URL` (`.convex.site`). Dev: run `npx convex dev` alongside `next dev`.

## Client provider (no auth)
```tsx
// app/ConvexClientProvider.tsx
"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
// app/layout.tsx: <html><body><ConvexClientProvider>{children}</ConvexClientProvider></body></html>
```
`useQuery`/`useMutation`/`usePaginatedQuery` only in `"use client"` components.

## `ConvexProviderWithAuth` (any auth provider via a `useAuth` hook)
```tsx
"use client";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useCallback, useMemo } from "react";

function useAuthFromProviderX() {
  const { isLoading, isAuthenticated, getToken } = useProviderXAuth();
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) =>
      await getToken({ ignoreCache: forceRefreshToken }),   // must return a JWT (OIDC id token) or null
    [getToken],
  );
  return useMemo(() => ({ isLoading, isAuthenticated: isAuthenticated ?? false, fetchAccessToken }),
    [isLoading, isAuthenticated, fetchAccessToken]);
}

<ConvexProviderWithAuth client={convex} useAuth={useAuthFromProviderX}>{children}</ConvexProviderWithAuth>
```
Backend `convex/auth.config.ts` must list the issuer: `{ providers: [{ domain: "https://issuer", applicationID: "aud" }] }`.
Pre-built wrappers: `ConvexProviderWithClerk` (`convex/react-clerk`, `useAuth` from `@clerk/nextjs`),
`ConvexProviderWithAuth0` (`convex/react-auth0`). Convex Auth uses `ConvexAuthNextjsProvider` instead (below).

## Convex Auth + Next.js
```tsx
// app/layout.tsx (server component)
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
export default function RootLayout({ children }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html><body><ConvexClientProvider>{children}</ConvexClientProvider></body></html>
    </ConvexAuthNextjsServerProvider>
  );
}

// app/ConvexClientProvider.tsx
"use client";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
export function ConvexClientProvider({ children }) {
  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}

// middleware.ts
import { convexAuthNextjsMiddleware, createRouteMatcher, nextjsMiddlewareRedirect } from "@convex-dev/auth/nextjs/server";
const isSignInPage = createRouteMatcher(["/signin"]);
const isProtectedRoute = createRouteMatcher(["/app(.*)"]);
export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isSignInPage(request) && (await convexAuth.isAuthenticated())) return nextjsMiddlewareRedirect(request, "/app");
  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) return nextjsMiddlewareRedirect(request, "/signin");
}, { cookieConfig: { maxAge: 60 * 60 * 24 * 30 } /* , verbose: true, apiRoute: "/api/auth" */ });
export const config = { matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"] };
```
Server helpers from `@convex-dev/auth/nextjs/server`: `isAuthenticatedNextjs()`, `convexAuthNextjsToken()`.
Client: `useAuthActions()` from `@convex-dev/auth/react` as usual.

## Server-side data: `preloadQuery` / `fetchQuery` (`convex/nextjs`)
```tsx
// app/tasks/page.tsx (server component) — SSR + stays reactive on the client
import { preloadQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server"; // or Clerk: (await auth()).getToken({ template: "convex" })
import { api } from "@/convex/_generated/api";
import { Tasks } from "./Tasks";

export default async function Page() {
  const preloaded = await preloadQuery(api.tasks.list, { list: "default" }, { token: await convexAuthNextjsToken() });
  return <Tasks preloaded={preloaded} />;
}

// app/tasks/Tasks.tsx
"use client";
import { usePreloadedQuery, Preloaded } from "convex/react";
export function Tasks({ preloaded }: { preloaded: Preloaded<typeof api.tasks.list> }) {
  const tasks = usePreloadedQuery(preloaded);   // hydrated instantly, then live-updates
  return <ul>{tasks.map(t => <li key={t._id}>{t.text}</li>)}</ul>;
}
```
```ts
// Server Actions / Route Handlers — non-reactive one-shots
import { fetchQuery, fetchMutation, fetchAction, preloadedQueryResult } from "convex/nextjs";
export async function createTask(formData: FormData) {
  "use server";
  await fetchMutation(api.tasks.create, { text: String(formData.get("text")) }, { token: await convexAuthNextjsToken() });
  revalidatePath("/tasks");
}
```
Options `{ token?, url? }`; `url` defaults to `NEXT_PUBLIC_CONVEX_URL`. `preloadedQueryResult(preloaded)` reads the
value on the server (e.g. for `generateMetadata`).

## Gotchas
- `preloadQuery` uses `cache: "no-store"` → the route becomes dynamic (no static prerender).
- Two `preloadQuery` calls are not guaranteed to see the same DB snapshot; prefer one query returning everything.
- `ConvexReactClient` must be created once per module (outside the component) to avoid reconnects.
- Convex Auth on Next.js is cookie-based: never mutate state in GET handlers (CSRF). `SITE_URL` env on Convex must
  equal the Next.js origin. Deploy: `npx convex deploy --cmd 'npm run build'` sets `NEXT_PUBLIC_CONVEX_URL` at build.
- Middleware `matcher` must include `/api` routes if your auth API route (`/api/auth`) is proxied through Next.
- Hydration: `useQuery` returns `undefined` on first client render; use `preloadQuery` for SSR-critical data.
