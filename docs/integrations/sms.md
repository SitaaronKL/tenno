# Programmatic SMS from a Node backend — options (Aug 2026)

## Comparison
| | Twilio | Telnyx | "Photon" (photon.codes) |
| --- | --- | --- | --- |
| US A2P 10DLC SMS | ~$0.0083/segment out + carrier fee (~$0.0035-0.0045) | ~$0.004/part + carrier fee (~half of Twilio) | not per-message; SMS/RCS only as *fallback* to iMessage |
| Toll-free | same as 10DLC rate | same as 10DLC rate | n/a |
| MMS | $0.022 out / $0.0165 in | $0.015 out / $0.005 in | via iMessage |
| Number rental | ~$1.15/mo local | ~$1/mo | Business tier $250/line/mo |
| 10DLC registration | $4.50 brand + ~$10/campaign/mo (both) | same (carrier fees are pass-through) | n/a |
| Node SDK | `twilio` (mature, huge ecosystem) | `telnyx` | REST `POST /v1/messages` + SDK |
| Strengths | docs, ecosystem, Verify/OTP product, Conversations | price, own carrier network, volume discounts | blue-bubble iMessage for AI agents |
| Weaknesses | price, occasional account-review friction | smaller community, fewer higher-level products | not an SMS provider |

At 1M msgs/mo US: Twilio ~$8.3k, Telnyx ~$4k (before carrier pass-through fees).

## About "Photon"
Full write-up in [photon.md](./photon.md).
There is **no established SMS provider called Photon**. The only match is **photon.codes** — an *iMessage* API for AI agents (plus WhatsApp/Telegram/Slack channels) with SMS/RCS listed only as an automatic fallback when iMessage delivery fails, priced per line/month rather than per message. Other hits are unrelated (Particle Photon IoT board, Photon in `next/og`?) — none are an SMS gateway. If the intent is "send texts to US phones from a Node backend", Photon is the wrong tool; if the intent is agent conversations over iMessage, it is worth a look.

## Recommendation
- **Cheapest solid option: Telnyx.** Roughly half Twilio's per-message price, first-party carrier network, straightforward Node SDK. Use it if cost per message matters and you are fine with a smaller ecosystem.
- **Twilio** if you want one vendor for SMS + voice + OTP (Verify) + WhatsApp and the best docs; pay ~2x for the convenience.
- Either way you must complete **A2P 10DLC brand + campaign registration** before sending business SMS to US numbers (or use a toll-free number with toll-free verification, simpler for low volume).
- Other cheap alternatives worth a glance: Plivo (~$0.0055), Sinch, Vonage, AWS SNS/End User Messaging (cheap but bare-bones).

## Code
```ts
// Twilio
import twilio from 'twilio'
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
const msg = await client.messages.create({
  to: '+15551234567',
  from: process.env.TWILIO_FROM,          // or messagingServiceSid: 'MG...'
  body: 'Your code is 123456',
})
console.log(msg.sid, msg.status)
// Inbound/status webhooks: POST form-encoded; verify with twilio.validateRequest(authToken, signature, url, params)

// Telnyx
import Telnyx from 'telnyx'
const telnyx = new Telnyx(process.env.TELNYX_API_KEY)
const res = await telnyx.messages.send({
  from: process.env.TELNYX_FROM,          // or messaging_profile_id
  to: '+15551234567',
  text: 'Your code is 123456',
})
console.log(res.data.id)
// Webhooks: JSON, signed with Ed25519 (telnyx-signature-ed25519 + telnyx-timestamp headers); verify via telnyx.webhooks.constructEvent
```
Next.js note: put these calls in a Route Handler or Server Action; keep keys server-side (no `NEXT_PUBLIC_`). Use the raw request body (`await req.text()`) when verifying webhook signatures.

Sources: Twilio US pricing page, Telnyx/Twilio comparisons (suprsend, courier, apiscout, sipnex), photon.codes pricing/platform pages.
