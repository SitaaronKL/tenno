# Server vs Client Components

## Decision table
| Need | Use |
| --- | --- |
| Fetch data near source, use secrets, reduce client JS, stream | **Server Component** (default for everything in `app/`) |
| `useState`/`useEffect`, event handlers, browser APIs (`window`, `localStorage`), custom hooks, React context | **Client Component** (`'use client'`) |

## How it renders
- Server: Server Components -> **RSC Payload** (serialized tree + client-component placeholders + props). Client Components + payload -> prerendered HTML.
- Client first load: HTML paints, RSC payload reconciles tree, JS hydrates Client Components.
- Navigations: RSC payload is prefetched/cached; Client Components render on the client.

## `'use client'` is a boundary, not a per-file tag
```tsx
// app/ui/counter.tsx
'use client'
import { useState } from 'react'
export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count} likes</button>
}
```
Everything imported by a `'use client'` file joins the client bundle. Components passed as `children`/props are NOT (they render on the server). Keep the directive on leaf interactive components, not whole layouts.

## Server -> Client data: serializable props only
```tsx
// app/[id]/page.tsx (server)
import LikeButton from '@/app/ui/like-button'
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getPost(id)
  return <LikeButton likes={post.likes} />
}
```
Can also pass a Promise and read it in the client with React's `use()` for streaming.

## Interleaving: pass Server Components as children of Client Components
```tsx
// app/ui/modal.tsx
'use client'
export default function Modal({ children }: { children: React.ReactNode }) { return <div>{children}</div> }

// app/page.tsx (server)
import Modal from './ui/modal'; import Cart from './ui/cart' // Cart is a server component
export default function Page() { return <Modal><Cart /></Modal> }
```
You cannot `import` a Server Component into a Client Component; pass it as a prop.

## Context providers
```tsx
// app/theme-provider.tsx
'use client'
import { createContext } from 'react'
export const ThemeContext = createContext({})
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>
}
// app/layout.tsx (server) -> <body><ThemeProvider>{children}</ThemeProvider></body>
```
Render providers as deep as possible (wrap `{children}`, not `<html>`).

## Third-party client-only libs
```tsx
// app/carousel.tsx
'use client'
import { Carousel } from 'acme-carousel'
export default Carousel   // now usable from Server Components
```

## Preventing env poisoning
- Only `NEXT_PUBLIC_*` env vars reach the browser; other `process.env.X` become `""` on the client.
- Guard server modules: `import 'server-only'` at the top -> build error if imported by a client module. `import 'client-only'` for the reverse. Installing the npm packages is optional (Next handles them internally).
