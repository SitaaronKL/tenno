# Spectrum REST API reference (condensed)

Source: /docs/api-reference/introduction, /docs/api-reference/oauth, /docs/api-reference/rate-limit, live OpenAPI at https://spectrum.photon.codes/openapi/json (Spectrum Cloud External API 1.0.0)

Management plane for a project's webhooks, platforms, lines, and users. Runtime messaging goes through the SDK or webhooks; there is no HTTP send message endpoint.

## Base URL and auth

- Base: `https://spectrum.photon.codes`, HTTPS only.
- Auth: HTTP Basic, username `projectId`, password `projectSecret` (`Authorization: Basic base64(projectId:projectSecret)`). Scoped to one project, never expires; rotate via `photon projects regenerate-secret`.
- The Dashboard API on `app.photon.codes` is separate and uses bearer tokens (CLI device flow token, or user consented OAuth 2.1 / OpenID Connect access tokens for apps acting on behalf of Photon users).
- Rate limit: 5 requests per second per project by default, 429 beyond; increases by request.

## Response envelope

`{ "succeed": true, "data": ... }` on success, `{ "succeed": false, "message": "..." }` on error. Lists return arrays under `data`. Codes: 200, 401 bad credentials, 404 missing or deleted, 409 conflict, 422 schema validation, 5xx retriable.

## Projects

- `GET /projects/{projectId}/`: name, slug, and profile `{ firstName, lastName, avatarUrl, imessageSynced }`. `imessageSynced` is true iff the project is Business tier and every active dedicated iMessage line has its current profile applied; Free and Pro (shared line) always report false; zero active dedicated lines on Business counts as synced.
- `GET/PATCH /projects/{projectId}/profile`, avatar via `POST .../profile/avatar/upload` then `.../avatar/commit`.
- `POST /projects/{projectId}/profile/sync` pushes the profile to lines; `GET` of the same path reads sync status.
- `PATCH /projects/{projectId}/slug/`.
- Billing: `GET /projects/{projectId}/billing/subscription` returns `{ tier, status: active|canceled|past_due|null, cancel_at_period_end, subscription_id, customer_id }`; `GET .../billing/status` reads billing sync status.

## iMessage service and tokens

- `GET /projects/{projectId}/imessage/`: `{ type: "shared" | "dedicated" }`.
- `GET /projects/{projectId}/imessage/shared/availability`: whether a new shared number can be assigned for a phone, mirroring user creation allocation rules (soft deleted slot reuse included).
- `POST /projects/{projectId}/imessage/tokens`: shared projects get one LightAuth token `{ type: "shared", token, expiresIn }`; dedicated projects get per instance tokens `{ type: "dedicated", auth: {instanceId: token}, numbers: {instanceId: phone}, expiresIn }`.
- `POST /projects/{projectId}/fusor/token`, `POST .../voice/tokens`, `POST .../whatsapp-business/tokens`, `POST .../slack/tokens`: platform token issuance.

## Lines

- `GET /projects/{projectId}/lines/` (optional `?platform=`): dedicated lines only, across platforms. iMessage rows: `{ platform: "imessage", id, phoneNumber, profile {firstName, lastName, avatarUrl}, status: available|unavailable|unknown, createdAt }`. On Free or Pro, lines are assigned per user, not owned; redirect users via `GET /users/{userId}/redirect` instead.
- `POST /projects/{projectId}/lines/` with `{ "platform": "imessage" }`: allocates a dedicated line, Business only, updates Stripe quantity with proration; returns the line plus `billing { quantity, prorationAmount, syncStatus }`.
- `GET /projects/{projectId}/lines/route`: best dedicated line for a new user, load balanced by active users and recent growth; skips lines younger than 15 minutes while an older one exists (SDKs discover lines only at token renewal); `isBestAvailable: false` marks a fallback (over 500 users or over 10 new users in the last minute); 404 with no dedicated lines.
- `GET/PATCH /projects/{projectId}/lines/{lineId}/profile`, per line avatar upload and commit, `DELETE /projects/{projectId}/lines/{lineId}`.

## Platforms

- `GET /projects/{projectId}/platforms/`: config including disabled entries. Shape: `imessage { enabled, autoScale? }`, `whatsapp_business { enabled }`, `voice { enabled, imessage_enabled? }`, `slack { enabled }`.
- `PATCH /projects/{projectId}/platforms/` with `{ platform: "imessage"|"whatsapp_business"|"voice"|"slack", enabled }` toggles, preserving stored metadata.
- `PATCH /projects/{projectId}/platforms/{platform}` updates platform metadata.

## Users

- `POST /projects/{projectId}/users/`: shared `{ type: "shared", phoneNumber (E.164), firstName?, lastName?, email? }` (server assigns a pool number, enforces `maxSharedUsers`, idempotent update on existing active phoneNumber) or dedicated `{ type: "dedicated", phoneNumber, assignedPhoneNumber }` (must match an owned line, idempotent on the tuple, same phone assignable to multiple lines). Response: `{ id, projectId, type, firstName, lastName, email, phoneNumber, assignedPhoneNumber, meta, createdAt }`.
- `GET /projects/{projectId}/users/`: active users, filters `?type=`, repeated `?id=`, `?search=` (partial case insensitive on names, phone, email), opt in `limit` (max 500) and `offset`, plus `total`.
- `GET /projects/{projectId}/users/{userId}/`, `DELETE .../users/{userId}/` (soft delete; the freed pool number can be reused).
- `GET /users/{userId}/redirect`: public, redirects a shared user to the right platform (currently an iMessage SMS deep link), optional `msg` to prefill the body.

## Webhooks

See webhooks-management.md for the full contract. Endpoints: `GET/POST /projects/{projectId}/webhooks/`, `PATCH/DELETE /projects/{projectId}/webhooks/{webhookId}`, `POST .../webhooks/{webhookId}/secret/rotate`, `GET .../webhooks/egress-ips`.

## Voice SIP inbound config

`GET/PATCH/DELETE /projects/{projectId}/voice/sip-inbound/` manage the inbound SIP route programmatically.

## WhatsApp Business and Slack

- `GET /projects/{projectId}/whatsapp-business/accounts`; template CRUD under `.../accounts/{accountId}/templates/` (GET, POST, PATCH `{templateId}`, DELETE `{templateId}`).
- Slack: `GET/PUT/DELETE /projects/{projectId}/slack/` app config, `GET .../slack/installations`, `PUT/DELETE .../slack/installations/{teamId}`, `POST .../slack/setup`.

## OAuth (Dashboard API)

Apps acting on behalf of a Photon user use OAuth 2.1 with OpenID Connect against `app.photon.codes`; see /docs/api-reference/oauth upstream for the full flow. Project credential Basic auth applies to the Spectrum API only.
