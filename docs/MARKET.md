# What the market taught us

Source: r/Warframe reaction to Tenno Tracker (882 upvotes, 97 comments), plus tenno.tools and hub.warframestat.us analysis, 2026-08-30.

## Rules we commit to

1. Everything is free, always. No paywall, no premium tier, no ads. Costs are controlled by design, not by charging: every external call goes through Convex and is cached and shared, the agent is rate limited per user. See Cost guardrails below.
2. No sign up to look. Dashboard, timers, item lookup are public. An account is needed only for alerts and saved builds. Guest sign in stays as a permanent "try it" path.
3. No heavy analytics. Error reporting only. Say so in the footer.
4. Email must land: verified domain with SPF, DKIM, DMARC before launch, plus guest sign in so a spam filter never blocks a first visit.
5. Do not lead with mastery checklists. FrameHub and AlecaFrame own that. Lead with live data, alerts, and the agent.

## Gaps people asked for that nobody fills well

- Drop locations inline with the item, not a click away (v2 resource tracker, free)
- "Filter Primes out, show what I can farm without relics or plat"
- Works on console and mobile with no install (we are a web app, add "install to home screen" hint)
- World state notifications (our v1, their "coming soon")
- Firefox and mobile friendly ways to find your account id

## Technical facts

- Public profile endpoint: `https://content.warframe.com/dynamic/getProfileViewingData.php?playerId=<id>`. No auth, returns mastery and profile data. DE IP bans on abuse, up to 24 hours. Fetch server side only, rate limit per user, cache for hours, never call from the browser.
- warframe.market blocks browser requests and allows about 3 requests per second. Prices go through Convex actions with a cache, never from the client.
- World state freshness: DE feed is live, tenno.tools parses DE itself and stays within 2 minutes, warframestat.us lags for hours. See docs/warframe-api.md.
- Account ids are hard to find on mobile. Any profile feature needs a clear "find your id" walkthrough.

## Cost guardrails

| upstream | policy |
|---|---|
| DE world state | one fetch per 5 minutes for all users, cron only |
| warframe.market | one fetch per item per 10 minutes, shared cache table, 3 requests per second cap inside the action |
| DE profile endpoint | one fetch per player id per 6 hours, server side only, per user rate limit on lookups |
| OpenAI | gpt-5.6-luna, per user limit of 20 agent messages and 10 rule drafts per hour via @convex-dev/rate-limiter, tools return trimmed data |
| Photon | opt in only, notifications per user capped by the existing 30 per hour limiter |

Client data fetching is Convex `useQuery` only. No TanStack Query: Convex already caches, dedupes, and pushes live updates, and the browser never calls a third party API.
