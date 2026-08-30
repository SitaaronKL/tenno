# Environment Variables

## Files and load order (first match wins)
1. `process.env` (shell / platform)
2. `.env.$(NODE_ENV).local`
3. `.env.local` (skipped when `NODE_ENV=test`)
4. `.env.$(NODE_ENV)`  (`.env.development`, `.env.production`, `.env.test`)
5. `.env`

- `NODE_ENV` is `development` for `next dev`, `production` otherwise; allowed: `production|development|test`.
- Files live at the project **root** even with `src/`. Commit `.env`, `.env.development`, `.env.production`, `.env.test` defaults if desired; never commit `*.local`.
- Multiline values and `$VAR` expansion supported (`TWITTER_URL=https://x.com/$TWITTER_USER`; escape literal `$` as `\$`).

```txt
# .env
DB_HOST=localhost
DATABASE_URL=postgres://...
NEXT_PUBLIC_ANALYTICS_ID=abcdefghijk
```

## Server vs browser
- Default: server only (`process.env.X` in Server Components, Route Handlers, actions, proxy).
- `NEXT_PUBLIC_*` is **inlined at `next build`** into client JS. Frozen after build — a single Docker image promoted across envs keeps the build-time value. Only static references are inlined (`process.env.NEXT_PUBLIC_X`, not `process.env[name]` or `const env = process.env`).
- Non-public vars referenced in client code become `""`. Use `import 'server-only'` to hard-fail accidental imports.

## Runtime (not build-time) server values
```tsx
import { connection } from 'next/server'
export default async function Component() {
  await connection()                  // opt into request-time rendering (cookies()/headers() do too)
  const value = process.env.MY_VALUE  // evaluated per request
}
```
Run startup code with `register()` in `instrumentation.ts`.

## Loading outside Next (ORM configs, tests)
```ts
// envConfig.ts
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())
// drizzle.config.ts: import './envConfig'; connectionString: process.env.DATABASE_URL!
// jest global setup: export default async () => loadEnvConfig(process.cwd())
```

## Vercel
Set vars per environment (Production / Preview / Development) in Project Settings; pull locally with `vercel env pull .env.local`. System vars like `VERCEL_URL`, `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA` are auto-provided. Sensitive vars can be marked non-readable in the dashboard.
