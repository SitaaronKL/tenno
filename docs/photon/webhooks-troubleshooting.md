# Webhook troubleshooting

Source: /docs/webhooks/troubleshooting

## Every request fails signature verification

Almost always: the body you hash is not the body Photon hashed. Log `rawBody.length`, first 80 chars, timestamp, signature length. Zero length means `req.json()` consumed the stream first. Reformatted JSON means the framework parsed and re-serialized. Signature length must be 67 (`v0=` plus 64 hex). Missing timestamp means a proxy strips `X-Spectrum-*` headers. Framework fixes: Express `express.raw({ type: 'application/json' })`, FastAPI `await request.body()`, Hono `await c.req.text()` first, Next.js route handler `await req.text()`, Workers `await request.text()`.

## Sporadic failures

Server clock skew beyond about 5 minutes (run NTP), or the wrong secret loaded in some environment (`SECRET.length === 64` should always hold). Rarely, a load balancer transforming large bodies.

## I never receive anything (zero deliveries)

Checklist, in order:

1. Confirm the webhook is registered: `curl -u "$PROJECT_ID:$PROJECT_SECRET" "https://spectrum.photon.codes/projects/$PROJECT_ID/webhooks/"`.
2. Confirm the URL is publicly reachable, `https://`, resolves to a public address, and does not redirect; otherwise the URL guard drops every delivery before it leaves the worker.
3. Confirm the platform is enabled and actually connected: `photon spectrum platforms ls`. A platform enabled in the dashboard but not connected, an unpaired iMessage line, an expired WhatsApp token, a throwing custom provider lifecycle handler, produces zero inbound events. Webhooks deliver what the SDK receives; a silent platform means silent webhooks. Check the SDK and pairing side first.
4. Confirm the message is actually inbound to your project: send from a phone number that is not your own line, to the line attached to the project (on Free or Pro shared plans, from a registered user's handle to that user's assigned pool number).
5. Ask support to check delivery attempts (webhook id, UTC timestamp, URL); every attempt is logged with structured fields. There is no self serve delivery log yet.

## Every delivery is dropped immediately

Registered and events flowing, but the worker's logs show deliveries never left: the URL guard. Registration only validates syntax, so the webhook looks healthy. Causes and fixes: `http://` (re-register with https), localhost or private or internal address (expose publicly, ngrok in dev), 301/302 redirect including trailing slash or http to https bounce (register the final URL), unresolvable hostname (fix DNS). All fatal, no retry. No update endpoint: delete and re-register.

## Duplicates

Expected under at least once delivery: handler succeeded but timed out, or returned 5xx after partial work. Dedupe at the top of the handler on `${webhookId}:${payload.message.id}` with a 24 to 48 hour TTL.

## Timeouts

Handlers over 30 seconds get retried and processed twice. Verify, enqueue, return 2xx; keep synchronous work to a few hundred ms P99.

## ngrok URL keeps changing

Free tunnels get a new URL per restart; the old registration then 404s. Delete and re-register on each restart, or use a reserved subdomain, or deploy a tiny stable forwarder.

## Leaked signing secret

Rotate via delete and re-register (or the Standard secret rotation endpoint). If project credentials may have leaked too, `photon projects regenerate-secret <id>`. A leaked signing secret only enables forged inbound events, not sending.

## Testing verification offline

Build a fake delivery locally: JSON body, `timestamp = floor(now/1000)`, `signature = 'v0=' + HMAC-SHA256(secret, 'v0:' + timestamp + ':' + body)` hex, POST it with the `X-Spectrum-*` headers via curl.

## Multiple URLs, different orders

Expected; deliveries run in parallel with no cross URL ordering. Designate one primary URL and fan out internally if consumers must coordinate.

## Escalating

Send project id (`photon projects show`), webhook id or URL, a UTC timestamp range, and one example body plus signature (secret redacted) to https://photon.codes/contact or the Discord.
