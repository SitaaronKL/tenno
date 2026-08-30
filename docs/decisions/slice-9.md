# Slice 9 questions and assumptions

Email and Photon delivery. Every open question, with the assumption I continued on.

## Packages and scripts

- Added devDependencies `vitest`, `convex-test`, `@edge-runtime/vm` and the script `"test": "vitest run"`.
  Only vitest is used so far, convex-test is there for the slices that test Convex functions.
- No new runtime dependencies. `@react-email/components` re-exports `render`, so `@react-email/render`
  was not added.

## convex/_generated and convex/convex.config.ts

`convex/` was empty on my branch, and I cannot log in to Convex, so `npx convex codegen` fails with
`MissingAccessToken`. To make `npx tsc --noEmit` pass I wrote two local files and left them **untracked**,
they are not in my commits:

- `convex/_generated/api.d.ts` and `convex/_generated/server.d.ts`, minimal stubs.
- `convex/convex.config.ts`, a copy of what the contract says slice 1 registers (resend, agent, rateLimiter, workflow).

Assumption: slice 1 commits the real `convex.config.ts` and the seam agent runs `npx convex codegen` on a real
deployment. `components.resend` must exist for `convex/email.ts` to compile.

## sendEmail args, the `react` argument

Question: the contract says `sendEmail({to, subject, react})`, but a React element cannot cross the Convex wire,
so `ctx.runAction(internal.email.sendEmail, ...)` cannot carry one.

Assumption: `react` stays the argument name and becomes a serializable descriptor of which template to render:

```ts
react: { template: "RuleMatch" | "Digest" | "MagicLink", props: <that template's props> }
```

`convex/email.ts` exports the validator as `vReact`. The action renders with `@react-email/components`
`render()` and sends html plus a plain text part. Callers (slice 4 notify.ts, slice 1 auth magic link) should
import `vReact` or just pass the object above. Props per template:

- `RuleMatch`: `{ ruleName, kind, title, detail?, expiresAt?, url }`
- `Digest`: `{ items: { ruleName, title, detail? }[], url }`
- `MagicLink`: `{ url }`

`convex/email.ts` is a `"use node"` file because React Email rendering wants the Node runtime.
`testMode` is `false` only when `RESEND_API_KEY` is set. `from` is
`Tenno <alerts@${process.env.EMAIL_DOMAIN ?? "resend.dev"}>`, so set `EMAIL_DOMAIN` on the deployment once the
domain is verified in Resend.

Not done: `onEmailEvent` bounce handling. It needs the `notifications` table owned by slice 4. Assumption:
slice 4 or the seam agent adds it later.

## Photon Users API, adding a phone to the shared line

Question: is there an API to add a phone to the shared line, or is the dashboard the only way?

Answer: there is one. Verified against `https://spectrum.photon.codes/openapi/json` (linked from
photon.codes/docs/api-reference/introduction) and the `spectrum-ts` types in node_modules.

```
POST https://spectrum.photon.codes/projects/{projectId}/users/
Authorization: Basic base64(projectId:projectSecret)
body: { "type": "shared", "phoneNumber": "+15551234567" }        // firstName, lastName, email optional
200:  { "succeed": true, "data": { "id": "<uuid>", "phoneNumber": "+1...", ... } }
```

It is idempotent on an existing phone number. `data.id` is the `photonUserId` we store on the profile.
`GET /projects/{projectId}/users/{userId}/` reads it back, which is how `sendText` resolves a phone when it is
given only a `photonUserId`.

Caveat that stays true: registering a user does not lift the shared line cold start rule. A shared line still
cannot open a conversation with a number that has never texted it, so the settings UI must keep the
"text START to the Tenno line" step. Outbound texts before that will fail.

## registerUser does not write the profile

`registerUser({phone})` returns the `photonUserId` as a string. It does not patch `profiles`, because
`convex/profiles.ts` is created by another slice. The caller stores it, see the snippet below.

## convex/profiles.ts, the phone change branch (for the seam agent)

I did not create the file. Add this inside `profiles.update`, after `requireUser(ctx)` and after loading the
caller's profile row:

```ts
// A new phone needs a Photon user before we can text it.
if (args.phone !== undefined && args.phone !== profile.phone) {
  const photonUserId: string = await ctx.runAction(internal.photon.registerUser, {
    phone: args.phone,
  });
  await ctx.db.patch(profile._id, {
    phone: args.phone,
    photonUserId,
    phoneVerifiedAt: undefined, // cleared until the user texts the line
  });
}
```

`profiles.update` must be an action, or the branch must run through a scheduled action, because
`registerUser` is an action and mutations cannot call actions. Assumption: the profiles owner schedules it,
`ctx.scheduler.runAfter(0, internal.photon.registerUser, ...)` plus an internal mutation that patches
`photonUserId`, if they prefer to keep `update` a mutation.

## The webhook handler lives in convex/photonHttp.ts

Question: the brief puts the http action in `convex/photon.ts`, but that file is `"use node"` for `spectrum-ts`,
and Convex http actions run in the default V8 runtime.

Assumption: the handler is `photonWebhook` in `convex/photonHttp.ts`, a file this slice owns. It verifies the
signature with `verifySpectrumSignature` from `@spectrum-ts/core/webhook`, the portable entry the SDK documents
as running in Convex isolates on the same HMAC as `app.webhook` (`v0:<timestamp>:<rawBody>`, 5 minute replay
window, 400 on missing headers, 401 on a bad signature). It then schedules `internal.photon.reply`, which is the
Node action that talks to the agent and sends the answer. Replying off the response also matches the SDK note
that a serverless handler may be frozen once the response returns.

### Mount snippet for convex/http.ts (slice 1 or the seam agent)

Inside the marked block in `convex/http.ts`:

```ts
import { photonWebhook } from "./photonHttp";

http.route({
  path: "/photon/webhook",
  method: "POST",
  handler: photonWebhook,
});
```

The public URL is `https://<deployment>.convex.site/photon/webhook`, set it in the Photon dashboard or with
`POST /projects/{projectId}/webhooks/`. Env vars used: `SPECTRUM_PROJECT_ID`, `SPECTRUM_PROJECT_SECRET`,
`PHOTON_WEBHOOK_SECRET`.

## Agent reply seam

Question: the contract gives `convex/agent/chat.ts` only `startThread`, `sendMessage({threadId, text})` and
`listMessages`. Nothing takes a phone.

Assumption: slice 7 adds an internal action `replyToInbound({ phone, text }) => string` in `convex/agent/chat.ts`
that finds or creates the thread keyed by the phone and returns the reply text. I reference it with
`makeFunctionReference<"action", { phone, text }, string>("agent/chat:replyToInbound")` so my file compiles
without the agent slice. If slice 7 names it differently, change that one line in `convex/photon.ts`.

## Inbound dedupe

Photon delivers at least once. I do not dedupe on `message.id` yet, there is no table for it in the contract.
Assumption: a duplicate inbound text produces a duplicate reply, acceptable for v1. A `photonMessages` table or
a rate limit on the agent would fix it.
