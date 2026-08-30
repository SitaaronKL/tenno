# Proxy (formerly Middleware)

Since Next.js 16, `middleware.ts` is **`proxy.ts`** with the same behavior. Place at project root (or `src/`), one file per project. Runs on the **Node.js runtime** before a request completes; can rewrite, redirect, set headers/cookies, or respond directly.

Use for: header manipulation, A/B rewrites, optimistic auth redirects, geo/locale routing. Not for: slow data fetching, full session/authorization logic. `fetch` cache options have no effect here. Prefer `redirects`/`rewrites`/`headers` in `next.config.ts` for static rules.

```ts
// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {        // or: export default function proxy(...)
  const { pathname } = request.nextUrl

  // Redirect
  if (pathname.startsWith('/about')) return NextResponse.redirect(new URL('/home', request.url))

  // Optimistic auth check via cookie
  const session = request.cookies.get('session')?.value
  if (pathname.startsWith('/dashboard') && !session) {
    const url = new URL('/login', request.url); url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Rewrite (URL unchanged)
  if (pathname === '/old') return NextResponse.rewrite(new URL('/new', request.url))

  // Continue, adding request + response headers / cookies
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', crypto.randomUUID())
  const res = NextResponse.next({ request: { headers: requestHeaders } })
  res.headers.set('x-frame-options', 'DENY')
  res.cookies.set('seen', '1', { httpOnly: true, sameSite: 'lax' })
  return res
}

export const config = {
  // Skip static assets, images, and metadata files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
  // or: matcher: ['/about/:path*', '/dashboard/:path*']
}
```

Matcher notes: must start with `/`; supports `:param`, `:path*`, `:path+`, regex in parens; can also be objects `{ source, has, missing }`. Requests can also be answered directly: `return new Response('Unauthorized', { status: 401 })` (e.g. produce a real 404 before streaming).

Migration from `middleware.ts`: rename file, rename export `middleware` -> `proxy`. Edge runtime is no longer the default; `export const runtime = 'edge'` remains possible but Node is standard.
