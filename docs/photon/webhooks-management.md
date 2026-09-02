# Managing webhooks

Source: /docs/webhooks/managing-webhooks, Spectrum OpenAPI

Base: `https://spectrum.photon.codes/projects/{projectId}/webhooks/`. Auth: HTTP Basic, username `projectId`, password `projectSecret` (the id also appears in the path). Credentials never expire; rotate with `photon projects regenerate-secret <id>`.

## Register

```sh
curl -X POST "https://spectrum.photon.codes/projects/$PROJECT_ID/webhooks/" \
  -u "$PROJECT_ID:$PROJECT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl":"https://your-app.com/spectrum-webhook"}'
```

Request fields: `webhookUrl` (required), `schemaVersion` (`normalized-events.v1` default, or `raw-inbound.v1` which preserves the inbound provider request, only for platforms Fusor serves), `eventTypes` (default `["message.received"]`, currently the only type), `failureNotificationEmail?`.

Response `data` includes the webhook row plus two one time secrets: `signingSecret` (verifies the legacy `X-Spectrum-Signature: v0=<hex>` header) and `standardSigningSecret` (`whsec_...`, for Standard Webhooks libraries over `webhook-id.webhook-timestamp.rawBody`). Neither is ever returned again; store both immediately.

Errors: 422 malformed URL, 409 same URL already active for this project (re-registering a previously deleted URL is fine and yields a new id and secrets), 401 bad credentials, 503 when a legacy webhook cannot be registered (rolled back, safe to retry). Registration validates syntax only; the delivery time URL guard enforces HTTPS, public address, and no redirect (see webhooks-delivery.md).

## List

`GET /projects/{projectId}/webhooks/` returns rows oldest first: `id`, `webhookUrl`, `schemaVersion`, `eventTypes`, `enabled`, `status` (`active | disabled`), `failureNotificationEmail`, `disabledAt`, `disabledReason` (`manual | receiver_gone | delivery_failures`), `createdAt`, `updatedAt`. Secrets are never included.

## Update

`PATCH /projects/{projectId}/webhooks/{webhookId}` updates `eventTypes`, `failureNotificationEmail`, `enabled`, or permanently upgrades `schemaVersion` to `raw-inbound.v1` (downgrade is refused with 422; a schema change must be sent alone, 409 otherwise; `eventTypes`/`enabled` changes 409 on endpoints still pinned to `normalized-events.v1`). Deploy the stored `standardSigningSecret` before upgrading; the update response does not reveal it again. The handoff enables the Fusor destination before disabling the legacy source, so delivery can briefly overlap but never gaps.

## Delete

`DELETE /projects/{projectId}/webhooks/{webhookId}`. After 200, no further events (an in flight delivery may complete). Soft delete; the id and secrets are gone forever. 404 when missing or already deleted; 503 when a legacy deregistration is unacknowledged (webhook stays active, retry safely). There is no URL update endpoint: fix a URL by delete and re-register.

## Rotate the Standard secret

`POST /projects/{projectId}/webhooks/{webhookId}/secret/rotate` with `{"overlapSeconds": 86400}` (0 to 604800). Returns a new `whsec_` secret and `previousValidUntil`; during overlap, deliveries carry signatures for both secrets. The legacy `signingSecret` is unchanged; rotating that one still means delete and re-register (verify against both secrets during the cutover window; deleting the old webhook is what cuts off the old secret).

## Egress IPs

`GET /projects/{projectId}/webhooks/egress-ips` returns the stable public IPv4 addresses Fusor delivers from; allowlist all of them, the set can change with advance notice.

## Multiple webhooks

Register as many URLs as needed; each has its own id and secrets, receives every event, and is delivered in parallel. Patterns: prod plus staging mirror, multi service fan out, backup logger endpoint. No per URL filtering: branch in the handler and 2xx the rest.

## Other surfaces

Dashboard Webhook tab (list, add with one time secret modal, remove). `photon webhooks` CLI is on the roadmap; meanwhile wrap curl with credentials from `photon projects show --json`.

Credential leak playbook: rotate the project secret first (`photon projects regenerate-secret`), then rotate every webhook secret. A leaked signing secret only lets an attacker forge inbound deliveries to your URL; sending messages requires the project secret.
