# Route Handlers (`route.ts`)

- Web `Request`/`Response` based API endpoints anywhere in `app/`. Cannot share a segment with `page.tsx`.
- Methods: `GET POST PUT PATCH DELETE HEAD OPTIONS` (others -> 405). Each file owns all verbs for its path.
- Do not participate in layouts or client navigation.

```ts
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const token = request.cookies.get('token')?.value      // or (await cookies()).get('token')
  const ua = (await headers()).get('user-agent')
  return NextResponse.json({ q, ua }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const body = await request.json()          // or request.formData() / request.text()
  const res = NextResponse.json({ ok: true }, { status: 201 })
  res.cookies.set('seen', '1', { httpOnly: true })
  return res
}
```

## Dynamic segments + typed context
```ts
// app/users/[id]/route.ts
import type { NextRequest } from 'next/server'
export async function GET(_req: NextRequest, ctx: RouteContext<'/users/[id]'>) {
  const { id } = await ctx.params   // params is a Promise
  return Response.json({ id })
}
```

## Redirect / rewrite / streaming
```ts
import { redirect } from 'next/navigation'
export async function GET() { redirect('https://nextjs.org/') }

export async function GET() {
  const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('hello')); c.close() } })
  return new Response(stream, { headers: { 'Content-Type': 'text/plain' } })
}
```

## Caching
- Not cached by default. Only `GET` can be cached.
- Without Cache Components: `export const dynamic = 'force-static'` (+ `export const revalidate = 60`) caches the GET.
- With Cache Components (`cacheComponents: true`): GET handlers follow page rules — prerendered if they touch no runtime/uncached data; `Math.random()`, DB/network, `headers()`, `cookies()`, `request.url` etc. defer to request time. `use cache` can't be written directly in the handler body; extract a helper:
```ts
import { cacheLife } from 'next/cache'
export async function GET() { return Response.json(await getProducts()) }
async function getProducts() {
  'use cache'
  cacheLife('hours')
  return db.query('SELECT * FROM products')
}
```

## Webhook pattern (raw body for signature verification)
```ts
export async function POST(req: Request) {
  const raw = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''
  // verify(raw, sig, secret) ...
  return new Response(null, { status: 200 })
}
```

## CORS
```ts
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization' } })
}
```
Segment config exports: `dynamic`, `revalidate`, `runtime = 'nodejs' | 'edge'`, `maxDuration`.
Special handlers (`sitemap.ts`, `opengraph-image.tsx`, `icon.tsx`) are static by default.
