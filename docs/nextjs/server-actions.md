# Server Functions / Server Actions

- **Server Function**: async function with `'use server'`, callable from the client over POST. When used for mutations (form `action`, `formAction`, `startTransition`) it's a **Server Action**; Next returns updated UI + data in one round trip.
- Only POST can invoke them. They are reachable by direct HTTP: **always authenticate/authorize inside every action.**
- Cannot be defined inside Client Components; import them from a `'use server'` file or receive them as props.
- Client dispatches actions sequentially (one at a time). Do parallel work inside one action or use Route Handlers.

## Defining
```ts
// app/actions.ts  (file-level directive: all exports are server functions)
'use server'
import { auth } from '@/lib/auth'
import { revalidatePath, revalidateTag, updateTag, refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function createPost(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  const title = formData.get('title')
  const content = formData.get('content')
  const post = await db.post.create({ data: { title, content } })
  updateTag('posts')          // read-your-own-writes: expire immediately
  redirect(`/posts/${post.id}`) // throws; nothing after runs
}

export async function incrementLike() { /* ... */ return newCount }

export async function exampleCookies() {
  const store = await cookies()
  store.get('name')?.value
  store.set('name', 'Delba')     // setting/deleting re-renders current page+layouts
  store.delete('name')
}
```
Inline in a Server Component:
```tsx
export default function Page() {
  async function createPost(formData: FormData) { 'use server'; /* ... */ }
  return <form action={createPost}>...</form>
}
```

## Invoking
```tsx
// Form (server or client component). Progressive enhancement works without JS in Server Components.
import { createPost } from '@/app/actions'
export function Form() {
  return (
    <form action={createPost}>
      <input name="title" /><input name="content" />
      <button type="submit">Create</button>
    </form>
  )
}

// Button formAction from a client component
'use client'
import { createPost } from '@/app/actions'
export function Button() { return <button formAction={createPost}>Create</button> }

// Event handler
'use client'
import { incrementLike } from './actions'
export default function LikeButton({ initialLikes }: { initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes)
  return <button onClick={async () => setLikes(await incrementLike())}>Like ({likes})</button>
}

// useEffect + transition
useEffect(() => { startTransition(async () => setViews(await incrementViews())) }, [])

// As a prop
<ClientForm updateItemAction={updateItem} />   // typed as (formData: FormData) => void
```

## Pending / state / validation
```tsx
'use client'
import { useActionState, startTransition } from 'react'
import { useFormStatus } from 'react-dom'
const [state, action, pending] = useActionState(createPost, initialState)
// action signature becomes (prevState, formData)
<form action={action}>{pending ? 'Saving...' : 'Save'}</form>
// Or inside a child of <form>: const { pending } = useFormStatus()
```
Return expected errors as values (`return { message: '...' }`), don't throw. Validate `FormData` (e.g. with zod) before mutating.

## After mutation
| Call | Effect |
| --- | --- |
| `revalidatePath('/posts')` | Invalidate cached data for a route |
| `revalidateTag('posts', 'max')` | Stale-while-revalidate by tag (actions + route handlers) |
| `updateTag('posts')` | Immediate expiry, read-your-own-writes (actions only) |
| `refresh()` from `next/cache` | Refresh client router without touching tagged cache |
| `redirect('/posts')` | Navigate; call revalidate before it |

Security: actions are POST endpoints with an unguessable ID but are NOT hidden. Check session and ownership inside every action; unused actions are dead-code eliminated. Configure `serverActions.allowedOrigins` / `bodySizeLimit` in `next.config.ts` if needed.
