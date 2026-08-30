# round2-auth questions and assumptions

## Password provider

- The slice brief gates the Password provider behind `NEXT_PUBLIC_AUTH_PASSWORD`. That variable is a browser
  variable, so it can only decide what the login page shows. Assumption: register `Password` on the server
  unconditionally, the same way `Discord` and `Resend` are already registered, because it needs no keys.
  Only `Anonymous` stays behind a server flag, since it is the dev only way in.
- No email verification, as asked. `validatePasswordRequirements` asks for 8 characters and `profile` lowercases
  and shape checks the email. Both throw `ConvexError`, which is the only error type whose message reaches the
  browser, so the login page can show the real reason.
- Convex Auth does not say whether a refused sign in was a wrong email or a wrong password, on purpose.
  Assumption: one message, "Wrong email or password.", and a different one for a failed sign up.
- The login page now has one email field shared by the password form and the magic link, instead of two fields
  labelled Email. Two would have been ambiguous for a screen reader and for the tests.

## Settings timezone

- "First load" has no marker in the schema. Assumption: a profile whose timezone is still the `UTC` default has
  never been saved, so the browser zone is adopted and saved once. A user who genuinely wants UTC and whose
  browser is on UTC is left alone, and once anything is saved the auto fill never fires again.
- Digest hour was already 9 by default. The auto save writes 9 together with the detected zone, so 9 now means
  nine in the morning where the user is, not nine UTC.
- The digest hour select trigger used to read back as "9" while the list said "09:00". Fixed in the trigger.

## Phone opt in, end to end

Checked against the live Photon project `550d43e3-1cd6-456d-93b8-335451754842` and the dev deployment
`steady-mongoose-632`. Three things were broken, two of them config.

1. **Phones were stored in a shape Photon can never match.** `normalizePhone` turned `(415) 555 0100` into
   `+4155550100`. Photon sends `+14155550100`, so `linkInbound` looked the profile up by a key that could not
   exist and the verified state never flipped. `convex/profiles.ts` now runs a local `toE164`: a bare ten digits
   gets `+1`, anything typed with a leading `+` is trusted as is. `convex/lib/phone.ts` is owned by another
   slice, so the fix lives in the file I own. Worth folding into `lib/phone.ts` later so `photonHttp` shares it.
2. **No webhook was registered.** `GET /projects/:id/webhooks/` returned an empty list, so Photon had nowhere to
   deliver inbound messages. Registered one: `https://steady-mongoose-632.convex.site/photon/webhook`,
   `schemaVersion: normalized-events.v1`, `eventTypes: ["message.received"]`, failure notifications to Dhruv.
   Webhook id `f138a891-93bb-465b-955e-7c0b353087d5`, delete it with `DELETE /projects/:id/webhooks/<id>`.
3. **`PHOTON_WEBHOOK_SECRET` was not set**, so the endpoint answered every delivery with 500. Photon returns the
   signing secret exactly once, in the create response, so it was set on the dev deployment in the same step.
   Verified after: a correctly signed delivery gets 200, a tampered one gets 401 `signature-mismatch`, a
   delivery with no headers gets 400. The probe used a reaction, not a text, so nothing was texted to anyone.

Assumption: registering the webhook and setting that secret count as the config the brief asked for. Both are
reversible, both point Dhruv's own project at Dhruv's own deployment.

Still open, none of it in files I own:

- The Photon project reports `imessageSynced: false` and `lines: []`. The line is assigned per user
  (`assignedPhoneNumber` on `GET /users/`), and Dhruv's is `+14156035536`, which is the number Settings shows.
  A second user on the shared pool could be assigned a different line, and then Settings would name the wrong
  number. Proper fix: store `assignedPhoneNumber` on the profile when `linkPhoton` registers the user, which
  needs a `photonLine` field in `convex/schema.ts`. For now the number is `NEXT_PUBLIC_PHOTON_NUMBER`, so a
  deployment can at least correct it without a code change.
- `linkPhoton` no longer lets a failed Photon registration throw. The inbound text is what verifies a phone, so
  a registration hiccup must not block the opt in.
- The verified pill was already live: `useProfile` is a Convex query, so the webhook write pushes to the open
  page with no reload.

## Not deployed

`npx convex dev` and `npx convex deploy` were off limits, so the deployment still runs the previous
`convex/auth.ts` and password sign in will report an unknown provider until the seam slice deploys. Everything
else here was verified against the live deployment or in tests.

## Env

`.env.example` gains `NEXT_PUBLIC_AUTH_PASSWORD=true` and `NEXT_PUBLIC_PHOTON_NUMBER`, and notes that
`PHOTON_WEBHOOK_SECRET` can only be read at creation time.
