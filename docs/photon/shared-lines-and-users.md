# Shared lines, user registration, line assignment, imessageSynced

Sources: /docs/spectrum-ts/providers/imessage/connection-and-routing, /docs/spectrum-ts/troubleshooting/imessage, Spectrum OpenAPI (https://spectrum.photon.codes/openapi/json)

## How shared lines work

On the Free and Pro plans a project owns no lines. It rides a shared pool of iMessage numbers (the Cosmos pool). Each registered end user of the project is assigned a number from the pool, one they have never received a message from before. Different users of the same project can therefore see different sender numbers. On the Business plan the project owns dedicated lines instead and all users text the same number.

`GET /projects/{projectId}/imessage/` returns `{ "type": "shared" | "dedicated" }` for the project.

## User registration is the pairing step

On shared plans, a shared line only messages, and is only paired with, recipients registered as users of the project. Registration is what allocates and pairs a pool number to that person:

- `POST /projects/{projectId}/users/` with `{ "type": "shared", "phoneNumber": "+1..." , firstName?, lastName?, email? }`. The server assigns a phone number from the Cosmos pool and enforces `maxSharedUsers` (10 on Free, 100 on Pro). Re-creating an existing active `phoneNumber` returns the same user and updates supplied fields.
- The response includes `assignedPhoneNumber`: the pool number paired to that user. That is the number this person must text to reach your agent.
- Dedicated variant: `{ "type": "dedicated", "phoneNumber", "assignedPhoneNumber" }` where `assignedPhoneNumber` must match a line the project owns; idempotent on the `(phoneNumber, assignedPhoneNumber)` tuple, and one user phone may be assigned to multiple lines.
- `GET /projects/{projectId}/users/` lists active users (`?type=`, `?search=`, `?id=` filters, opt in `limit`/`offset`). `DELETE .../users/{userId}/` soft deletes; a soft deleted user's previously assigned number can be reused on re-registration within the same project.
- `GET /projects/{projectId}/imessage/shared/availability?phoneNumber=...` checks whether a new shared number can be assigned to that phone, mirroring the allocation rules of user creation.

The registered handle must be the handle Apple actually sends iMessage from. If Apple registered the person under an email or a different number, the inbound sender never matches the registered user. https://debug.photon.codes reports the exact handle a device sends from.

## Getting users into the conversation

`GET /users/{userId}/redirect` is a public endpoint that redirects a shared user to the right messaging surface, currently an iMessage SMS deep link to their assigned number, with an optional `msg` query parameter to prefill the body. On shared plans use this instead of listing lines: `GET /projects/{projectId}/lines/` returns only dedicated lines and is empty for Free and Pro projects.

Line assignment for new users on Business: `GET /projects/{projectId}/lines/route` returns the single best dedicated line to assign a new user to, load balancing by active user count and recent growth. Lines provisioned less than 15 minutes ago are skipped while an older line exists, because running SDK instances only discover new lines at token renewal, and routing users to a brand new line could strand their messages on replicas that cannot see it yet. `isBestAvailable: false` flags a least bad fallback (over 500 users, or growth over 10 users in the last minute). 404 when the project owns no dedicated lines.

## imessageSynced

`GET /projects/{projectId}/` returns the project name, slug, and profile. When a profile is set, the response includes `imessageSynced`, defined as: true iff the project is Business tier and every active dedicated iMessage line has its current profile successfully applied. Free and Pro projects ride a shared line and always report `false`. Zero active dedicated lines on Business counts as synced. So `imessageSynced: false` on a Free or Pro project is normal and permanent, not an error state.

Profile sync itself: `POST /projects/{projectId}/profile/sync` pushes the project profile to lines, `GET /projects/{projectId}/profile/sync` reports status. Per line profiles: `GET`/`PATCH /projects/{projectId}/lines/{lineId}/profile` plus avatar upload and commit endpoints.

## Consequences for inbound delivery and webhooks

Webhooks deliver what the platform side receives. A shared line that has no user paired for the sender produces no inbound event, so a registered webhook receives nothing. The webhook troubleshooting checklist calls this out: a platform enabled in the dashboard but not actually connected, an unpaired iMessage line included, produces zero inbound events. Check the platform and user pairing side first (`photon spectrum platforms ls`, `photon spectrum users ls`), then send the test message from a phone that is registered as a user, to that user's `assignedPhoneNumber`.

Outbound to an unregistered target on a shared plan fails loudly instead: `Target not allowed for this project`.

## Quotas relevant to shared plans

- Free: up to 10 users. Pro: up to 100 users. Business: unlimited users with auto-scale.
- 5,000 messages per server per day, 50 new conversations per line per day (mostly a Business cold outreach concern).
