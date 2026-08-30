# Voidwatch

Never miss a fissure, a Baro visit, or an invasion reward again. Live Warframe world state, custom alerts by email or iMessage, and an agent you can text.

Live app: coming soon. Repo: https://github.com/SitaaronKL/tenno

Fan project, not affiliated with Digital Extremes.

## System design

The block below is generated from the code by `node scripts/readme-diagram.mjs` and refreshed by CI on every push to main, so it stays true.

<!-- diagram:start -->
```
                 api.warframestat.us  (fallback: api.warframe.com/cdn/worldState.php)
                            |
                  cron: ingest every 5 min, digest hourly                 
                            v
  +-------------------------------------------------------------------------+
  |  Convex  components: resend, agent, rateLimiter, workflow               |
  |                                                                         |
  |  tables: profiles, worldState, worldEvents, rules, notifications        |
  |                                                                         |
  |  ingest.pull -> normalize -> apply -> worldEvents                       |
  |        rules.evaluate (matcher, rate limit) -> notifications            |
  |        notify.send / notify.digest                                      |
  |  agent (OpenAI): chat tools, rule builder                               |
  +-------------------------------------------------------------------------+
         |                     |                       |
         v                     v                       v
  Next.js pages          Resend email            Photon iMessage / SMS
  /  (landing)
  /chat
  /dashboard
  /login
  /logo
  /rules
  /settings
```
<!-- diagram:end -->

## Run it yourself

```
  you                                      services you need
  ---                                      -----------------
  1. git clone https://github.com/SitaaronKL/tenno
     cd tenno && npm install

  2. npx convex login                       Convex account (free)
     npx convex dev                         creates a dev deployment, writes .env.local
                                            leave this running

  3. npx @convex-dev/auth                  generates JWT_PRIVATE_KEY and JWKS on the deployment,
                                            sign in fails without them
     npx convex env set OPENAI_API_KEY sk-...        OpenAI (agent, rule builder)
     npx convex env set AUTH_ALLOW_GUEST true        guest sign in, dev only
     echo NEXT_PUBLIC_ALLOW_GUEST=true >> .env.local

     optional, for alerts:
     npx convex env set RESEND_API_KEY re_...        Resend (email)
     npx convex env set AUTH_RESEND_KEY re_...       Resend (magic link sign in)
     npx convex env set EMAIL_DOMAIN yourdomain.com  verified sender domain
     npx convex env set SPECTRUM_PROJECT_ID ...      Photon (iMessage)
     npx convex env set SPECTRUM_PROJECT_SECRET ...
     npx convex env set AUTH_DISCORD_ID ...          Discord sign in
     npx convex env set AUTH_DISCORD_SECRET ...
       redirect URL: https://<deployment>.convex.site/api/auth/callback/discord

  4. npm run dev                            second terminal
     open http://localhost:3000

  5. npm test                               vitest, tests sit beside the code they test
     npm run lint
     npm run build
```

Every variable is listed in `.env.example`. Anything missing just switches that feature off, the app still runs.

## Deploy

```
  Vercel  <- npm run build, env: NEXT_PUBLIC_CONVEX_URL, NEXT_PUBLIC_* flags
  Convex  <- npx convex deploy, env set on the production deployment
```

## Docs

`docs/ARCHITECTURE.md` design, `docs/CONTRACT.md` function map and ownership, `docs/ROADMAP.md` what is next (builds, resource tracker, patch aware suggestions), `docs/warframe-api.md` upstream data notes.
