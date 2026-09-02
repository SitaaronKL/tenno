# Telegram provider

Source: /docs/spectrum-ts/providers/telegram/setup, /docs/spectrum-ts/providers/telegram/conversations-and-features

## Config

```ts
import { telegram } from "spectrum-ts/providers/telegram";

telegram.config({ botToken: "your-bot-token" });
```

| Option | Description | Env fallback |
| --- | --- | --- |
| `botToken` | Bot token from @BotFather | `SPECTRUM_TELEGRAM_BOT_TOKEN` |
| `webhookSecret` | Optional secret token for verifying webhook payloads | `SPECTRUM_TELEGRAM_WEBHOOK_SECRET` |
| `baseUrl` | Bot API base URL, default `https://api.telegram.org` | `SPECTRUM_TELEGRAM_BASE_URL` |

## Webhook registration

In cloud mode (projectId and projectSecret present) the provider registers its Fusor webhook automatically on startup. In local or direct mode, configure the webhook yourself through the Telegram Bot API.

## Conversations

Resolve a user by Telegram user id to open their private chat. Bots cannot create groups; use `space.get(chatId)` for an existing group, supergroup, or channel, and stringify numeric chat ids.

```ts
const tg = telegram(app);
const user = await tg.user("123456789");
const space = await tg.space.create(user);
const group = await tg.space.get(process.env.TELEGRAM_CHAT_ID!);
```

## Feature support

| Feature | Support |
| --- | --- |
| Text | Send and receive |
| Markdown | Send, rendered as Telegram HTML via `parse_mode` |
| Streaming text or markdown | Send, native draft preview in private chats |
| Media (photos, documents, audio, video) | Send and receive |
| Reactions | Send and receive |
| Threaded replies | Send and receive |
| Typing indicators | Send |
| Message edits | Send and receive |
| Custom Bot API calls | Send with `custom({ method, params })` content |
