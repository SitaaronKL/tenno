# Resend (Node SDK) — quick reference

```bash
npm install resend            # + react-email components: npm install @react-email/components
```
Env: `RESEND_API_KEY` (server only). Test sender: `onboarding@resend.dev`; production requires a verified domain.

## Send email
```ts
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

const { data, error } = await resend.emails.send({
  from: 'Acme <noreply@updates.acme.com>',
  to: ['user@example.com'],
  subject: 'Hello World',
  html: '<strong>It works!</strong>',          // or text:, or react:
  replyTo: 'support@acme.com',
  tags: [{ name: 'category', value: 'confirm_email' }],
  attachments: [{ filename: 'invoice.pdf', content: buffer }], // 40MB total after encoding
})
if (error) console.error(error)   // SDK returns { data, error }; it does not throw
```
Batch: `resend.batch.send([{...}, {...}])` (up to 100). Idempotency: pass `{ idempotencyKey }` as 2nd arg.

## React Email templates
```tsx
// emails/welcome.tsx
import { Html, Body, Container, Heading, Text, Button } from '@react-email/components'
export default function WelcomeEmail({ name }: { name: string }) {
  return (
    <Html><Body style={{ fontFamily: 'sans-serif' }}><Container>
      <Heading>Welcome, {name}!</Heading>
      <Text>Thanks for signing up.</Text>
      <Button href="https://acme.com/start">Get started</Button>
    </Container></Body></Html>
  )
}
```
```ts
// app/api/send/route.ts (Next.js Route Handler)
import { Resend } from 'resend'
import WelcomeEmail from '@/emails/welcome'
const resend = new Resend(process.env.RESEND_API_KEY)
export async function POST() {
  const { data, error } = await resend.emails.send({
    from: 'Acme <onboarding@resend.dev>',
    to: ['delivered@resend.dev'],
    subject: 'Welcome',
    react: WelcomeEmail({ name: 'John' }),   // call as a function, not <WelcomeEmail/>
  })
  return error ? Response.json({ error }, { status: 500 }) : Response.json(data)
}
```
Preview templates locally with `npx react-email dev` (or `email dev`). Render to HTML manually with `render()` from `@react-email/render`.

## Domains
- Add a domain in Dashboard -> Domains (or API `resend.domains.create({ name: 'updates.acme.com', region: 'us-east-1' })`, then `resend.domains.verify(id)`).
- Use a **subdomain** (`updates.`/`mail.`) to isolate reputation; separate subdomains for marketing vs transactional.
- DNS: add the provided **DKIM** (TXT/CNAME) and **SPF** (TXT + MX on the bounce subdomain) records; optionally **DMARC** (`_dmarc` TXT, e.g. `v=DMARC1; p=none; rua=mailto:...`) and BIMI. Choose sending region per domain. Status becomes `verified` after propagation.

## Webhooks
- Create in Dashboard -> Webhooks, choose events, copy the **signing secret** (`RESEND_WEBHOOK_SECRET`, `whsec_...`).
- Events: `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.complained`, `email.bounced`, `email.opened`, `email.clicked`, `email.failed`, plus `contact.*` and `domain.*` events.
- Payload: `{ type, created_at, data: { email_id, from, to, subject, tags, bounce?, click?... } }`. Delivery is at-least-once: dedupe on the `svix-id` header.
- Verify signatures using the **raw body** (Svix-compatible headers `svix-id`, `svix-timestamp`, `svix-signature`):
```ts
// app/api/webhooks/resend/route.ts
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)
export async function POST(req: Request) {
  const payload = await req.text()
  try {
    const event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get('svix-id')!,
        timestamp: req.headers.get('svix-timestamp')!,
        signature: req.headers.get('svix-signature')!,
      },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
    })
    // handle event.type / event.data
    return new Response(null, { status: 200 })
  } catch {
    return new Response('invalid signature', { status: 400 })
  }
}
// Alternative: npm i svix -> new Webhook(secret).verify(payload, headersObj)
```
Docs: https://resend.com/docs
