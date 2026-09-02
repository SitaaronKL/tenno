# Voidwatch

Never miss a fissure, a Baro visit, or an invasion reward again. Live Warframe world state, custom alerts by email or iMessage, and an agent you can text.

Live app: https://tenno.watch. Repo: https://github.com/SitaaronKL/tenno

Fan project, not affiliated with Digital Extremes.

## System design

The block below is generated from the code by `node scripts/readme-diagram.mjs` and refreshed by CI on every push to main, so it stays true.

<!-- diagram:start -->
```
                 api.warframestat.us  (fallback: api.warframe.com/cdn/worldState.php)
                            |
                  cron: ingest every 5 min, digest hourly, resets hourly, schedule horizon daily, retention weekly
                            v
  +---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
  |  Convex  components: resend, agent, rateLimiter, workflow                                                                                                                             |
  |                                                                                                                                                                                       |
  |  tables: profiles, photonInbound, worldState, worldEvents, rules, notifications, completions, items, starNodes, profileCache, mods, builds, dropSources, parts, deNames, goals        |
  |                                                                                                                                                                                       |
  |  ingest.pull -> normalize -> apply -> worldEvents                                                                                                                                     |
  |        rules.evaluate (matcher, rate limit) -> notifications                                                                                                                          |
  |        notify.send / notify.digest                                                                                                                                                    |
  |  agent (OpenAI): chat tools, rule builder                                                                                                                                             |
  +---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
         |                     |                       |
         v                     v                       v
  Next.js pages          Resend email            Photon iMessage / SMS
  /  (landing)
  /builds
  /builds/[id]
  /chat
  /dashboard
  /login
  /mastery
  /resources
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

     optional, for alerts:
     npx convex env set RESEND_API_KEY re_...        Resend (email, and the magic link button)
     npx convex env set AUTH_RESEND_KEY re_...       Resend (magic link sign in)
     npx convex env set EMAIL_DOMAIN yourdomain.com  verified sender domain
     npx convex env set SPECTRUM_PROJECT_ID ...      Photon (iMessage)
     npx convex env set SPECTRUM_PROJECT_SECRET ...
     npx convex env set AUTH_DISCORD_ID ...          Discord sign in
     npx convex env set AUTH_DISCORD_SECRET ...
       redirect URL: https://<deployment>.convex.site/api/auth/callback/discord

  4. node scripts/import-public-export.mjs   refreshes convex/gamedata from DE's Public Export
     node scripts/build-components.mjs      names every part a recipe asks for, and what that
                                            part is built from, into convex/gamedata/components.json
     node scripts/build-drop-sources.mjs    trims the WFCD drop table mirror to the best eight
                                            places an item drops, convex/gamedata/dropSources.json
     node scripts/build-de-names.mjs        the DE id to name tables, and the /Lotus item paths

     node scripts/seed-tables.mjs           loads all six reference tables with convex import,
                                            about 12,000 rows. None of this JSON is bundled into
                                            a function, so this is the only way the tables fill.
                                            /mastery, /builds and /resources are empty until it
                                            runs once, and DE names items by the tail of their
                                            path until deNames is seeded.
                                            One table at a time: node scripts/seed-tables.mjs mods
                                            Shape it without importing: --dry-run --out ./out

  5. npm run dev                            second terminal
     open http://localhost:3000

  6. npm test                               vitest, tests sit beside the code they test
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
