# Project Structure (Next.js 16)

## Top-level
| Item | Purpose |
| --- | --- |
| `app/` | App Router (routes, layouts, handlers) |
| `public/` | Static assets served at `/` |
| `src/` | Optional; `app/` may live inside it. `.env*` files stay at project root |
| `next.config.ts` | Config |
| `proxy.ts` | Request proxy (was `middleware.ts` before v16) |
| `instrumentation.ts` | OpenTelemetry / startup `register()` |
| `.env`, `.env.local`, `.env.development`, `.env.production` | Env vars |
| `next-env.d.ts`, `tsconfig.json`, `eslint.config.mjs` | Tooling |

## Routing file conventions (inside `app/`)
| File | Role |
| --- | --- |
| `layout.tsx` | Shared UI; preserves state across navigations; root layout must render `<html>`/`<body>` |
| `page.tsx` | Makes a segment publicly routable |
| `loading.tsx` | Suspense fallback for the segment |
| `error.tsx` | Client error boundary (`'use client'`) |
| `global-error.tsx` | Error boundary for root layout; must render its own `<html>`/`<body>` |
| `not-found.tsx` | 404 UI (triggered by `notFound()`) |
| `route.ts` | API endpoint; cannot coexist with `page.tsx` in the same segment |
| `template.tsx` | Like layout but re-mounts on navigation |
| `default.tsx` | Fallback for parallel-route slots |

Render hierarchy per segment: `layout` > `template` > `error` > `loading` > `not-found` > `page`/nested `layout`.
Note: `loading` wraps `page`/`not-found`/child layouts but NOT its own segment's `layout`/`template`/`error`.

## Segment patterns
| Path | URL |
| --- | --- |
| `app/page.tsx` | `/` |
| `app/blog/[slug]/page.tsx` | `/blog/my-post` (single param) |
| `app/shop/[...slug]/page.tsx` | `/shop/a`, `/shop/a/b` (catch-all) |
| `app/docs/[[...slug]]/page.tsx` | `/docs`, `/docs/a/b` (optional catch-all) |
| `app/(marketing)/page.tsx` | `/` (route group, omitted from URL) |
| `app/blog/_components/Post.tsx` | not routable (private folder) |
| `app/dashboard/@analytics/page.tsx` | parallel route slot, rendered as `props.analytics` in `dashboard/layout.tsx` |
| `app/feed/(.)photo/[id]/page.tsx` | intercepting route: same level `(.)`, parent `(..)`, two up `(..)(..)`, root `(...)` |

## Colocation rules
- A folder is only routable once it has `page` or `route`. Other files inside `app/` are safe to colocate.
- Route groups enable multiple layouts at one level, and **multiple root layouts** (delete `app/layout.tsx`, add one per group, each with `<html>`/`<body>`).
- Put `loading.tsx` inside a route group `(overview)` to scope the skeleton to one page.

## Example tree
```
app/
  layout.tsx            # root layout
  page.tsx              # /
  (marketing)/
    about/page.tsx      # /about
  (shop)/
    layout.tsx          # shop-only layout
    cart/page.tsx       # /cart
  blog/
    layout.tsx
    page.tsx            # /blog
    loading.tsx
    error.tsx
    [slug]/
      page.tsx          # /blog/:slug
      not-found.tsx
      opengraph-image.tsx
  api/
    posts/route.ts      # GET/POST /api/posts
  _lib/db.ts            # private, not routable
proxy.ts
next.config.ts
```

## Metadata files (also routing conventions)
`favicon.ico`, `icon.(png|svg|tsx)`, `apple-icon.png`, `opengraph-image.(png|tsx)`, `twitter-image.*`, `sitemap.(xml|ts)`, `robots.(txt|ts)`, `manifest.(json|ts)`. See metadata.md.
