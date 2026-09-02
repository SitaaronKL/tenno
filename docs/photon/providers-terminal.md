# Terminal provider

Source: /docs/spectrum-ts/providers/terminal/setup-and-usage, /docs/spectrum-ts/providers/terminal/interactions

A local chat interface for development, integration tests, and CLI style agents. No credentials, no required config.

```ts
import { terminal } from "spectrum-ts/providers/terminal";
const app = await Spectrum({ providers: [terminal.config()] });
```

`terminal.config()` spawns the standalone tuichat binary (auto downloaded from GitHub Releases on first run) as a subprocess and drives it over JSON-RPC. In a TTY it boots the rich UI; in a non TTY context (CI, piped input) it falls back to a synchronous readline loop, so the same agent code works in scripted tests.

## Config

```ts
terminal.config({
  commands: [{ name: "/clear", description: "Clear conversation memory" }],
});
```

`commands` (default `[]`) surfaces slash commands in the TUI command picker; names must match `/^\/[A-Za-z0-9_-]+$/`. Slash commands arrive as regular text messages.

## Spaces

The TUI starts on `chat-1`; Ctrl+N opens `chat-2` and so on, each its own space. Open a named space programmatically with `terminal(app).space.get("debug")`, which ensures the chat exists in the sidebar.

## Interactions

| Feature | How |
| --- | --- |
| Multiple chats | Ctrl+N new, Ctrl+J and Ctrl+K to switch |
| Reactions | Press `r` on a message; arrives as `reaction` content |
| Replies | Press `e`; arrives with a `replyTo: { messageId }` extra |
| File attachments | Drag and drop; arrives with name, MIME type, buffer |
| Inline images | Kitty graphics protocol when supported, half block fallback |
| Typing indicators | `space.startTyping()` / `stopTyping()` render live |
| Console capture | console.log and friends are forwarded to a pinned `__system__` chat |
