# Routing, Layouts, Loading & Error UI

## Pages and layouts
```tsx
// app/layout.tsx  (root layout: REQUIRED, must include html/body)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><main>{children}</main></body>
    </html>
  )
}

// app/blog/layout.tsx  (nested layout, wraps /blog and descendants)
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <section>{children}</section>
}

// app/blog/page.tsx  (Server Component by default; may be async)
import { getPosts } from '@/lib/posts'
export default async function Page() {
  const posts = await getPosts()
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```
Layouts preserve state and do not re-render on navigation; use `template.tsx` if you need remount.

## Dynamic segments: `params` and `searchParams` are Promises
```tsx
// app/blog/[slug]/page.tsx
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  return <h1>{post.title}</h1>
}

// Typed helper (global, no import): PageProps<'/blog/[slug]'>, LayoutProps<'/dashboard'>
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
  return <h1>{slug}</h1>
}

// searchParams (opts page into request-time rendering)
export default async function Page({ searchParams }: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { q } = await searchParams
}
```
- Server: `searchParams` prop for data loading. Client: `useSearchParams()` from `next/navigation`.
- Prerender specific params at build: `export async function generateStaticParams() { return [{ slug: 'a' }] }`.
- With Cache Components, awaiting `params` at the top of a layout makes the whole layout dynamic; pass the promise down and await inside a `<Suspense>` child to keep the shell static.

## Navigation
```tsx
import Link from 'next/link'
<Link href={`/blog/${post.slug}`} prefetch={true}>{post.title}</Link>

'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
const router = useRouter(); router.push('/x'); router.replace('/y'); router.refresh(); router.back()
```
Server-side: `redirect('/login')` and `permanentRedirect()` from `next/navigation` (throw; place before streaming starts).

## loading.tsx (instant loading state)
```tsx
// app/dashboard/loading.tsx  -> auto wraps page.tsx in <Suspense>
export default function Loading() { return <p>Loading...</p> }
```
- Fallback is prefetched; navigations are interruptible; shared layouts stay interactive.
- Streamed responses return HTTP 200. `notFound()`/`redirect()` after streaming starts can't change status (Next adds `<meta name="robots" content="noindex">` for streamed 404s). Need a true 404? Check in `proxy.ts` or before any `await` that suspends.
- If a layout reads uncached/runtime data (`cookies()`, `headers()`), `loading.tsx` won't cover it: move that fetch into the page or wrap in `<Suspense>`.
- Manual granular streaming:
```tsx
import { Suspense } from 'react'
export default function Page() {
  return (
    <>
      <Suspense fallback={<p>Loading feed...</p>}><PostFeed /></Suspense>
      <Suspense fallback={<p>Loading weather...</p>}><Weather /></Suspense>
    </>
  )
}
```

## Expected errors: return values, not throws
```ts
// app/actions.ts
'use server'
export async function createPost(prevState: any, formData: FormData) {
  const res = await fetch('https://api.example.com/posts', { method: 'POST', body: formData })
  if (!res.ok) return { message: 'Failed to create post' }
}
```
```tsx
'use client'
import { useActionState } from 'react'
import { createPost } from '@/app/actions'
export function Form() {
  const [state, formAction, pending] = useActionState(createPost, { message: '' })
  return (
    <form action={formAction}>
      <input name="title" required />
      {state?.message && <p aria-live="polite">{state.message}</p>}
      <button disabled={pending}>Create</button>
    </form>
  )
}
```

## notFound() + not-found.tsx
```tsx
import { notFound } from 'next/navigation'
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()
  return <div>{post.title}</div>
}
// app/blog/[slug]/not-found.tsx
export default function NotFound() { return <div>404 - Page Not Found</div> }
```
`app/not-found.tsx` at root handles unmatched URLs globally.

## error.tsx (uncaught exceptions) — note `retry`, not `reset`
```tsx
'use client' // error boundaries must be Client Components
import { useEffect } from 'react'
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => retry()}>Try again</button>
    </div>
  )
}
```
- Errors bubble to the nearest `error.tsx`; the same segment's `layout.tsx` is NOT covered (put `error.tsx` in the parent for that).
- Error boundaries don't catch errors in event handlers/async code; use `useState` there. Throws inside `startTransition` do bubble to boundaries.

### Component-level boundary: `catchError`
```tsx
'use client'
import { catchError, type ErrorInfo } from 'next/error'
function ErrorFallback(props: { title: string }, { error, retry }: ErrorInfo) {
  return <div><h2>{props.title}</h2><p>{error.message}</p><button onClick={() => retry()}>Try again</button></div>
}
export default catchError(ErrorFallback)
// usage: <ErrorBoundary title="Dashboard Error">{children}</ErrorBoundary>
```

### global-error.tsx (root layout errors; must render html/body)
```tsx
'use client'
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html><body>
      <h2>Something went wrong!</h2>
      <button onClick={() => retry()}>Try again</button>
    </body></html>
  )
}
```
