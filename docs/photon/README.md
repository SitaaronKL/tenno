# Photon documentation mirror

Condensed mirror of the Photon (photon.codes) documentation, fetched 2026-09-02 from https://photon.codes/docs/llms.txt and the per page markdown endpoints (append `.md` to any docs URL). The Spectrum API surface comes from the live OpenAPI spec at https://spectrum.photon.codes/openapi/json.

Photon is an agent native messaging platform. Spectrum is its multi platform agent framework: build one agent, connect it to iMessage, WhatsApp Business, Telegram, terminal, and SIP voice.

## Files

| File | Covers |
| --- | --- |
| [spectrum-getting-started.md](spectrum-getting-started.md) | Install, credentials, first app, app instance, logging, telemetry |
| [spectrum-core.md](spectrum-core.md) | Messages, spaces, users, content narrowing, custom events, lifecycle |
| [providers-imessage.md](providers-imessage.md) | Cloud and local packages, line model, quotas, routing, troubleshooting |
| [shared-lines-and-users.md](shared-lines-and-users.md) | Shared pool mechanics, user registration, line assignment, imessageSynced |
| [providers-telegram.md](providers-telegram.md) | Telegram provider setup and features |
| [providers-whatsapp.md](providers-whatsapp.md) | WhatsApp Business provider setup and conversations |
| [providers-terminal.md](providers-terminal.md) | Terminal provider for dev, tests, and CLI agents |
| [providers-voice.md](providers-voice.md) | SIP outbound and inbound calls on iMessage lines |
| [custom-platforms.md](custom-platforms.md) | definePlatform, Fusor backed providers |
| [webhooks-overview.md](webhooks-overview.md) | Model, quickstart, mental model, security |
| [webhooks-events.md](webhooks-events.md) | Exact wire format: headers, body, content shapes |
| [webhooks-signatures.md](webhooks-signatures.md) | Signature verification recipe and pitfalls |
| [webhooks-delivery.md](webhooks-delivery.md) | Retry policy, status codes, URL guard, idempotency |
| [webhooks-management.md](webhooks-management.md) | Register, list, update, delete, rotate secrets |
| [webhooks-troubleshooting.md](webhooks-troubleshooting.md) | Symptom keyed fixes, including zero delivery causes |
| [cli.md](cli.md) | Photon CLI: install, auth, projects, spectrum, billing |
| [api-reference.md](api-reference.md) | Spectrum REST API: auth, endpoints, payloads, rate limits |
| [pricing-and-limits.md](pricing-and-limits.md) | Plans, quotas, deliverability rules |

## Key facts at a glance

- Spectrum API base URL: `https://spectrum.photon.codes`, HTTP Basic auth with `projectId` as username and `projectSecret` as password.
- Webhook signature: `X-Spectrum-Signature: v0=<hex>` where hex is HMAC-SHA256 over `v0:<timestamp>:<rawBody>` keyed by the per webhook signing secret.
- Free and Pro plans ride a shared line pool: each registered user gets a pool number, no groups, sends to unregistered targets fail with `Target not allowed for this project`.
- Business plan uses dedicated lines the project owns, with group support and no allowlist.
- Support: help@photon.codes, debug bot at https://debug.photon.codes, dashboard at https://app.photon.codes.
