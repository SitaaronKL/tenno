# Caching & Revalidation (Next.js 16 — Cache Components)

## Model summary
- Next 16 has **no implicit caching**: nothing is cached unless you say so. `fetch()` is not cached by default. Route Handlers are not cached by default.
- The recommended model is **Cache Components**, enabled with `cacheComponents: true`. It turns on `'use cache'`, `cacheLife`, `cacheTag`, and **Partial Prerendering (PPR)** as the default rendering strategy: every route produces a static shell; uncached/runtime parts stream in behind `<Suspense>`.
- Without `cacheComponents`, the "previous model" applies (`fetch(url, { next: { revalidate, tags } })`, segment config `dynamic`/`revalidate`, `unstable_cache`). See https://nextjs.org/docs/app/guides/caching-without-cache-components.

```ts
// next.config.ts
import type { NextConfig } from 'next'
const nextConfig: NextConfig = { cacheComponents: true }
export default nextConfig
```

## `'use cache'`
Marks an **async** function, component, or whole file as cacheable. Cache key = build ID + function ID + serialized args (incl. closed-over variables).
```ts
// Data-level
import { cacheLife, cacheTag } from 'next/cache'
export async function getUsers() {
  'use cache'
  cacheLife('hours')
  cacheTag('users')
  return db.query('SELECT * FROM users')
}

// UI-level (component / page / layout)
export default async function Page() {
  'use cache'
  cacheLife('hours')
  const users = await db.query('SELECT * FROM users')
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}

// File-level: all exports cached (must all be async)
'use cache'
export async function getTopProducts() { /* ... */ }
```
Rules:
- Args/returns must be RSC-serializable (primitives, plain objects, arrays, Date/Map/Set; JSX only as return). Class instances, functions, URL are not — but `children`/Server Actions may be **passed through** untouched.
- **Cannot** call `cookies()`, `headers()`, or read `searchParams` inside (error `next-request-in-use-cache`). Read outside and pass as args:
```tsx
async function ProfileContent() {
  const session = (await cookies()).get('session')?.value
  return <CachedContent sessionId={session} />
}
async function CachedContent({ sessionId }: { sessionId: string }) {
  'use cache'
  return <div>{await fetchUserData(sessionId)}</div>
}
```
- `React.cache` scope is isolated inside `use cache`.
- Variants: `'use cache: private'` (may read runtime APIs; result cached in the browser per prefetch), `'use cache: remote'` (durable shared handler e.g. Redis/KV via `cacheHandlers`; costs a network trip).
- Runtime storage is in-memory LRU per instance by default: persists on self-hosted servers, generally NOT across serverless invocations. All entries are scoped to a deployment/build ID.
- Draft Mode bypasses all caches.
- Debug: `NEXT_PRIVATE_DEBUG_CACHE=1`.

## `cacheLife` profiles
| Profile | stale (client) | revalidate (server) | expire |
| --- | --- | --- | --- |
| `default` | 5m | 15m | never |
| `seconds` | 30s | 1s | 60s |
| `minutes` | 5m | 1m | 1h |
| `hours` | 5m | 1h | 1d |
| `days` | 5m | 1d | 1w |
| `weeks` | 5m | 1w | 30d |
| `max` | 5m | 30d | 1y |
```ts
cacheLife({ stale: 3600, revalidate: 7200, expire: 86400 })
```
Always set one explicitly. "Short-lived" caches (`seconds`, `revalidate: 0`, `expire < 5m`) are excluded from the prerender and become dynamic holes. Client router enforces a minimum 30s stale.

## Static vs streaming vs runtime
```tsx
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { connection } from 'next/server'

export default function Page() {
  return (
    <>
      <header>Static — prerendered</header>
      <BlogPosts />                                   {/* 'use cache' → in static shell */}
      <Suspense fallback={<p>Loading...</p>}>
        <UserPreferences />                           {/* reads cookies() → streams */}
      </Suspense>
      <Suspense fallback={<p>...</p>}>
        <UniqueContent />                              {/* await connection() then Math.random()/Date.now() */}
      </Suspense>
    </>
  )
}
async function UniqueContent() { await connection(); return <p>{crypto.randomUUID()}</p> }
```
- Uncached async work or runtime APIs (`cookies`, `headers`, `searchParams`, dynamic `params`) **must** sit under `<Suspense>` (or be cached) or the build errors with a "blocking-route" insight.
- Predictable sync work (`fs.readFileSync`, imports, pure computation) prerenders automatically. Random/time values need `connection()` + Suspense, or `use cache` to freeze them.
- `generateStaticParams` prerenders listed params; unknown params get the App Shell then ISR-upgrade in the background.
- Bots/crawlers get a fully dynamic render instead of the shell.
- Prefetching: `<Link prefetch={true}>` prefetches the per-URL cached content (needs `partialPrefetching`).

## Revalidation
```ts
import { revalidateTag, updateTag, revalidatePath, refresh } from 'next/cache'

revalidateTag('posts', 'max')   // stale-while-revalidate; 2nd arg = how long stale may be served ('max' recommended). Actions + Route Handlers.
updateTag('posts')              // immediate expiry, read-your-own-writes. Server Actions ONLY.
revalidatePath('/profile')      // path-based; over-invalidates, prefer tags.
refresh()                       // re-render client router; does not touch tagged cache.
```
| | `updateTag` | `revalidateTag` |
| --- | --- | --- |
| Where | Server Actions only | Actions + Route Handlers |
| Behavior | Expire now | Stale-while-revalidate |
| Use | User sees own change immediately | Background refresh OK |

CMS pattern: `cacheTag('cms')` + `cacheLife('max')`, then a webhook Route Handler calls `revalidateTag('cms', 'max')`.

## Previous model (no `cacheComponents`) quick ref
```ts
fetch(url, { cache: 'force-cache' })                    // opt-in cache (default is no-store)
fetch(url, { next: { revalidate: 3600, tags: ['posts'] } })
export const dynamic = 'force-static' | 'force-dynamic'; export const revalidate = 60
import { unstable_cache } from 'next/cache'              // for non-fetch; persists across deploys
```
