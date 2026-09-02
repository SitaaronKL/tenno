# iMessage provider

Source: /docs/spectrum-ts/providers/imessage/connection-and-routing, /docs/spectrum-ts/troubleshooting/imessage

Cloud and local iMessage are separate platforms, selected by provider import, not a config flag. A macOS app can register both.

## Cloud: @spectrum-ts/imessage (also spectrum-ts/providers/imessage)

Authenticates with Spectrum Cloud and connects to managed iMessage infrastructure over gRPC. Supports sending, receiving, typing indicators, reactions, replies. Group creation and inbound group change events require a dedicated line.

```ts
const app = await Spectrum({
  projectId: process.env.SPECTRUM_PROJECT_ID!,
  projectSecret: process.env.SPECTRUM_PROJECT_SECRET!,
  providers: [imessage.config()],
});
```

With automatic discovery, the SDK finds all cloud lines owned by the project and renews tokens at 80 percent of TTL. Advanced routing can pin an SDK instance to a subset of lines:

```ts
imessage.config({
  clients: [{ address: "line-1.imsg.photon.codes:443", token: "your-token", phone: "+15551111111" }],
});
```

Explicit clients are not token renewed by the SDK. The cloud transport uses Node compatible gRPC, so deploy to Node.js or Bun; strict edge isolates are not supported.

## Local: @spectrum-ts/imessage-local

Reads the macOS Messages SQLite database (`~/.Library/Messages/chat.db`) directly, no project credentials. Platform id is `"local_imessage"`. Supports receiving and sending text, attachments, and contacts. Not available: reactions, threaded replies, edits, unsend, read receipts, effects, group creation, streaming text, backgrounds, renaming, avatars, contact card sharing, membership ops. Typing is a no op. Needs Full Disk Access for the running process; restart the terminal after granting. Under Node, `better-sqlite3` may need explicit install; Bun uses built in SQLite.

## Line model

Cloud mode routes messages through phone numbers, called lines, provisioned by Spectrum.

| Plan | Line allocation | End users see | Groups |
| --- | --- | --- | --- |
| Free / Pro | Shared pool: each end user is routed through a number from a shared pool | Normal iMessage from a number that may differ across recipients | No group creation, no inbound group change events |
| Business | Dedicated: all end users text the same project owned number | Always the same number | Group creation and inbound group events supported |

DM delivery is identical across both models. Shared pool mode does not subscribe to the iMessage group event stream at all: member adds and removes, leaves, renames, and avatar changes never appear on `app.messages`.

### Auto-scale

Business only, opt in via project settings. When a dedicated line approaches capacity, Spectrum provisions another line automatically.

### When line changes reach a running app

The SDK learns lines from the credentials it mints and re-mints on a schedule. A line provisioned or removed mid run is picked up at the next token renewal, not immediately. Until then the new line is invisible: it receives no inbound messages and `space.create()` cannot route through it. Messages sent to it in that window are not delayed, they are never delivered to your app. Restart the process to pick up a new line immediately.

With two or more dedicated lines: `space.get(chatGuid)` requires `params.phone`, and `space.create()` without `phone` picks a line at random. Neither applies to shared pool mode, which always routes through a single shared identity.

## Quotas

- 5,000 messages per server per day, counting every send across all chats. Extra sends are rejected until the window resets.
- 50 new conversations initiated per line per day. A new conversation is the first message a line sends to a recipient it has never messaged. Replies within existing conversations do not count.
- Contact help@photon.codes for increases.

## Spaces and users

iMessage spaces carry `type` (`"dm"` or `"group"`) and `phone` (the line handling the conversation). Users resolved through narrowing carry optional `address`, `country`, and `service` (`"iMessage" | "SMS" | "RCS" | "unknown"`), also on `message.sender` after narrowing.

```ts
const im = imessage(app);
const alice = await im.user("+15551111111");
const dm = await im.space.create(alice);
const group = await im.space.create([alice, bob]);            // dedicated lines only
const onLine = await im.space.get("any;-;+15551111111", { phone: "+15559999999" });
const pinned = await im.space.create(alice, { phone: "+15559999999" }); // per phone routing, Business only
```

In shared pool mode, multi user `space.create()` throws `UnsupportedError`, and the `phone` space param is ignored. `space.get(chatGuid)` can reference an existing group but shared mode still receives no membership or metadata changes.

## Messaging features (per feature guides exist upstream)

Message effects, chat renaming, group avatars, group membership, inbound group events, inbound read receipts, chat backgrounds, iMessage app cards, native contact card sharing, curated Apple message metadata, attachment fetching by GUID (`im.getAttachment(id, phone?)`), and tapback reaction mapping from Spectrum emoji aliases.

## Troubleshooting highlights

- `imessage.config({ local: true })` is gone; local moved to `@spectrum-ts/imessage-local`.
- A cloud build pulling `better-sqlite3` means the local package leaked into the deployed dependency graph; remove it and keep Mac and cloud composition modules separate.
- "Target not allowed for this project": you are on Free or Pro, and a shared line only messages recipients registered as users of the project. Add the user in the dashboard Users tab, or via the API. If it still fails, the handle you registered is not the one Apple actually sends from: message https://debug.photon.codes, the debug bot replies with the exact handle, register that. If the bot reports an email, the iPhone is starting conversations from the Apple Account email; fix under Settings, Messages, Send and Receive.
- Received text can rarely differ from the sender's bubble when they type and send very fast; the mismatch is upstream of Photon, in Apple's delivered payload.
- Still stuck: send project id (`photon projects show`), exact error string, target handle, and the handle the debug line reports to help@photon.codes.
