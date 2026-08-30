# Metadata & OG Images

Only in Server Components (`layout.tsx`/`page.tsx`). Next always emits `<meta charset>` and `<meta name="viewport">`.

## Static
```tsx
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: { default: 'Acme', template: '%s | Acme' },   // child pages set title: 'Blog' -> "Blog | Acme"
  description: '...',
  metadataBase: new URL('https://acme.com'),
  openGraph: { title: 'Acme', images: ['/og.png'] },
  robots: { index: true, follow: true },
}
```

## Dynamic
```tsx
import type { Metadata, ResolvingMetadata } from 'next'
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  const prev = (await parent).openGraph?.images ?? []
  return { title: post.title, description: post.description, openGraph: { images: [post.image, ...prev] } }
}
export default function Page({ params }: Props) {}
```
- Dedupe page + metadata fetches with `React.cache`: `export const getPost = cache(async (slug) => db...)`.
- Metadata is **streamed** for dynamic pages (does not block UI); blocking for HTML-limited bots (Twitterbot, Slackbot...). Configure via `htmlLimitedBots` in config.
- With Cache Components, uncached/runtime access in `generateMetadata` follows the same Suspense/`use cache` rules as the page.
- `generateViewport` / `export const viewport` for theme-color, width, etc.

## File-based metadata (in `app/` or any segment; more specific wins)
| File | Result |
| --- | --- |
| `favicon.ico`, `icon.png|svg|tsx`, `apple-icon.png` | icons |
| `opengraph-image.png|tsx`, `twitter-image.*` | social images (+ optional `opengraph-image.alt.txt`) |
| `sitemap.xml` or `sitemap.ts` | sitemap |
| `robots.txt` or `robots.ts` | robots |
| `manifest.json|ts` | web manifest |

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next'
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts()
  return [{ url: 'https://acme.com', lastModified: new Date() },
          ...posts.map(p => ({ url: `https://acme.com/blog/${p.slug}`, lastModified: p.updatedAt }))]
}
// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: '/admin' }, sitemap: 'https://acme.com/sitemap.xml' }
}
```

## Generated OG image
```tsx
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { getPost } from '@/app/lib/data'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  return new ImageResponse(
    <div style={{ fontSize: 128, background: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {post.title}
    </div>
  )
}
```
`ImageResponse` (satori/resvg) supports flexbox + subset of CSS (no grid), custom fonts, nested images. Playground: https://og-playground.vercel.app/
