# Pricing, plans, and limits

Source: https://photon.codes/pricing, /docs/best-practices/imessage-deliverability, /docs/spectrum-ts/providers/imessage/connection-and-routing, /docs/api-reference/rate-limit (fetched 2026-09-02, prices can change)

## Plans

| Plan | iMessage price | Number type | Users | Groups | Cold outreach |
| --- | --- | --- | --- | --- | --- |
| Open Source | Free (your own Mac) | Your own iCloud number | n/a | Limited | No |
| Free | $0 | Managed shared pool | Up to 10 | No | No |
| Pro | $25/mo | Managed shared pool | Up to 100 | No | No |
| Business | $250 per line per month | Dedicated lines owned by the project | Unlimited (auto-scale required) | Full group messaging API | Up to 50 new contacts per line per day |
| Enterprise | Custom | Dedicated, you own the numbers | Unlimited | Full | Up to 50 per day, lowest throttling |

All plans: unlimited daily messages (subject to operational quotas below), RCS and SMS fallback, full DM API, iOS 26 features (polls, chat backgrounds), Telegram included, SMS/RCS included. Business adds phone calls, WhatsApp, bring your own iMessage mini apps, dedicated Slack and Discord support. Tiers in the CLI and API: `pro`, `business`, `enterprise`; managed through Stripe (`photon projects upgrade`, `photon billing ...`).

Number types explained: Managed Shared (Free and Pro) assigns each of your users a fresh pool number they have never received a message from. Dedicated (Business) allocates numbers just for your project, all users text the same number.

## Operational quotas (enforced)

- 5,000 messages per server per day, counting every send across all chats; further sends are rejected until the window resets.
- 50 new conversations initiated per line per day (first message ever to a recipient; replies do not count).
- Shared plans: outbound only to registered users of the project, otherwise `Target not allowed for this project`.
- Spectrum API: 5 requests per second per project, then 429.
- Increases: help@photon.codes.

## Deliverability guidance (Apple filters on behavior, not content)

- Inbound first is the decision that matters: users text you first, never see the Report Junk banner. Prepopulate the first message with `sms:+1...&body=...` deep links; share a contact card early. After a user sends about three messages Apple treats the conversation as trusted.
- Capacity planning: about 700 to 1,000 users per line for moderate usage, 500 to 700 for intensive; spread users across lines, stop assigning at 70 to 80 percent utilization, enable smart routing and auto-scale on Business.
- What gets a line flagged: burst sending (100 plus in a tight window), broadcasting without exchange, hammering non responders past 2 or 3 follow ups, cold outreach to non opted in people, off hours sending.
- Do not put links or media in the first message (Apple suppresses link clicking until a reply lands), do not leave lines dormant (about 2 months idle gets a line deactivated), do not use iMessage for cold outreach (use A2P channels), do not segment Android users onto separate lines.
- SMS and RCS fallback traffic is filtered by carriers separately; track it apart from iMessage line health.
- Flagged lines enter Photon's recovery process; email help@photon.codes with project id and line.
