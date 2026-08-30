# What the market taught us

Source: r/Warframe reaction to Tenno Tracker (882 upvotes, 97 comments), plus tenno.tools and hub.warframestat.us analysis, 2026-08-30.

## Rules we commit to

1. Core value is free: timers, alerts, drop locations, market prices, tracking. Never behind a paywall. If money is ever needed, charge for convenience only (SMS cost, dedicated iMessage line) and say the price on the landing page.
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
