# Architecture

Warframe companion app: live world-state dashboard + custom notifiers (email / iMessage-SMS) + an AI agent that builds rules and answers questions over text.

Deployed product on Vercel + Convex Cloud. Not packaged for self-hosting.

## Stack (decided 2026-08-29)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 16 App Router, shadcn/ui, Tailwind v4 | `docs/nextjs/` |
| Backend/DB | Convex 1.45 | crons, reactive queries, components — `docs/convex/` |
| Auth | Convex Auth: Discord OAuth + email magic link (Resend) | `docs/convex/04-convex-auth.md` |
| Email | `@convex-dev/resend` (+ React Email templates) | **set `testMode: false` in prod** |
| iMessage/SMS | Photon Spectrum (`spectrum-ts`) | `docs/integrations/photon.md` |
| AI | `@convex-dev/agent` + OpenAI models via AI SDK | `docs/convex/09-component-agent.md`, `docs/openai/` |
| World state | `api.warframestat.us/{platform}` | `docs/warframe-api.md`; CDN-cached 2 min |

## Data flow

```
cron (every 5 min)
  └─ ingest.pull  (action)  fetch api.warframestat.us/pc
        └─ ingest.apply (mutation) diff vs stored → upsert `worldState` snapshot
                                                  → insert new `worldEvents`
                                                  → schedule rules.evaluate(eventIds)
rules.evaluate (mutation)
  └─ for each active rule matching event.kind → match filter → insert `notifications`
        (unique on rule×event; rate-limited per user via @convex-dev/rate-limiter)
notify.dispatch (action, scheduled)
  ├─ mode=instant → send now
  └─ mode=digest  → hourly cron collects pending → one email/text per user
        ├─ email  → @convex-dev/resend
        └─ imessage → Photon space.send (space stored on user after opt-in)
```

Dashboard reads `worldState` via `useQuery` → live updates without polling on the client.

## Tables (sketch)

- `worldState` — one doc per platform, last full normalized snapshot + `fetchedAt`
- `worldEvents` — `{ platform, kind, key, startsAt, expiresAt, payload, seenAt }`; `kind` ∈ fissure | alert | invasion | sortie | archonHunt | baro | nightwave | cycle | event
- `users` (Convex Auth) + `profiles` — `{ platform, email, phone, photonSpaceId, timezone, digestHour }`
- `rules` — `{ userId, name, kind, filter (structured JSON), mode: instant|digest, channels: [email|imessage], enabled, source: manual|ai }`
- `notifications` — `{ userId, ruleId, eventId, channel, status, sentAt }` — index on `[ruleId, eventId]`
- `agentThreads` — managed by `@convex-dev/agent`

## Rule filter shape

Structured, zod-validated, shared between UI form, AI structured output, and the matcher. Example:

```ts
{ kind: "fissure", tier: ["Axi"], missionType: ["Survival","Defense"], steelPath: true }
{ kind: "invasion", reward: ["Orokin Catalyst Blueprint"] }
{ kind: "baro", items: ["Primed Chamber"] }
```

The AI rule builder does natural language → this schema (OpenAI structured outputs) → user confirms → saved. The model never writes free-form rules.

## AI agent (Convex Agent component)

One agent definition, two surfaces:
1. **Web** — "Ask" panel on the dashboard + the rule builder.
2. **iMessage** — Photon webhook (HTTP action on `.convex.site`) → agent thread keyed by phone → reply via `space.send`.

Tools (Convex functions): `getWorldState`, `searchItems`, `createRule`, `listRules`, `getMarketPrice` (later).

## Opt-in for iMessage

Photon Free/Pro shared lines cannot cold-message. Flow: user enters phone → UI shows "text START to +1…" → inbound webhook links `photonSpaceId` to the user → notifications allowed from then on. Email is the default channel.

## Known gotchas

- warframestat `arbitration` currently returns a placeholder (`typeKey: "Unknown"`) — hide it.
- Don't `Date.now()` in queries (cache never refreshes); compute expiry client-side or in scheduled mutations.
- HTTP actions/webhooks live on `*.convex.site`, not `.convex.cloud`.
- Convex Auth is 0.0.x — pin it.
