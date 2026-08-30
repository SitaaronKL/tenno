# Deployment (and Vercel specifics)

| Option | Feature support |
| --- | --- |
| Node.js server (`next build` + `next start`) | All |
| Docker (`output: 'standalone'`) | All |
| Static export (`output: 'export'`) | Limited: no server features (actions, route handlers w/ dynamic data, proxy, ISR, `use cache`, streaming) |
| Adapters (Adapter API) | Verified: **Vercel**, **Bun**. Cloudflare/Netlify have own integrations |

```json
{ "scripts": { "dev": "next dev", "build": "next build", "start": "next start" } }
```
Docker: use `output: 'standalone'` in `next.config.ts`, copy `.next/standalone`, `.next/static`, `public`, run `node server.js`. Self-hosting caching/ISR needs a shared `cacheHandler` (e.g. Redis) when running multiple instances, plus `cacheMaxMemorySize`.

## Vercel
- Zero-config: import the Git repo at vercel.com/new or run `vercel` CLI (`npm i -g vercel`; `vercel` = preview, `vercel --prod` = production). Every push to a branch gets a Preview Deployment with its own URL; the production branch (usually `main`) deploys to production.
- Framework-native features map automatically: Route Handlers/Server Actions/dynamic pages -> Vercel Functions (Fluid compute, Node runtime); `use cache`/ISR -> Vercel Data Cache + CDN; `'use cache: remote'` uses Vercel's durable cache; static shell served from the edge CDN; streaming supported; `proxy.ts` runs before routing.
- Env vars: Project Settings -> Environment Variables, scoped to Production / Preview / Development; `vercel env pull` writes `.env.local`. Note `NEXT_PUBLIC_*` values are baked at build.
- Config knobs in `next.config.ts`/`vercel.json`: `maxDuration` (segment export or per-function), `regions`, `export const preferredRegion`, cron jobs (`vercel.json` `crons` hitting a Route Handler), `images.remotePatterns` for `next/image` optimization.
- Deployment protection (password/Vercel auth) for previews; `VERCEL_ENV`, `VERCEL_URL` system env vars; `deploymentId` config keeps cache keys stable across skew-protected deploys.
- Observability: Runtime Logs, Web Analytics (`@vercel/analytics`), Speed Insights (`@vercel/speed-insights`).
- A new deploy starts all `use cache`/ISR entries fresh (cache key includes the build ID).

Checklist before deploying: run `next build` locally, ensure `cacheComponents` build insights are resolved (no blocking routes), set env vars for each environment, verify `metadataBase`, and add `robots`/`sitemap`.
