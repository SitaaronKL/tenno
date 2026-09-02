# Spectrum core concepts

Source: /docs/spectrum-ts/messages, /docs/spectrum-ts/spaces-and-users, /docs/spectrum-ts/custom-events-and-lifecycle

## Primitives

| Primitive | Meaning |
| --- | --- |
| `Message` | Incoming or outgoing content plus metadata |
| `Space` | A conversation: DM, group chat, terminal session |
| `User` | A participant, `{ __platform, id, kind?: "agent" }` |
| Provider | Platform adapter translating native protocols into the unified interface |

Every inbound message arrives as a `[space, message]` tuple from `app.messages`. The space is already bound to the conversation, so you can reply without resolving anything.

## Message interface

```ts
interface Message<TPlatform, TSender, TSpace> {
  content: Content;                 // discriminated union, narrow on content.type
  direction: "inbound" | "outbound";
  readonly id: string;
  platform: TPlatform;
  sender: TSender | undefined;
  space: TSpace;
  timestamp: Date;
  edit(newContent): Promise<void>;
  react(reaction: string): Promise<Message | undefined>;  // undefined when unsupported
  read(): Promise<void>;            // inbound only, marks chat read up to this message
  reply(content): Promise<Message | undefined>;           // variadic overload returns Message[]
  unsend(): Promise<void>;          // outbound only, iMessage window is about 2 minutes
}
```

Filter your own sends with `if (message.direction === "outbound") continue;`.

## Space interface

```ts
interface Space {
  readonly __platform: string;
  readonly id: string;
  send(content): Promise<Message | undefined>;  // variadic overload returns Message[]
  edit(message, newContent): Promise<void>;
  unsend(message): Promise<void>;
  read(message): Promise<void>;
  getMessage(id): Promise<Message | undefined>;
  getMembers(): Promise<User[]>;                // excludes the agent account where known
  getAvatar(): Promise<AvatarData | undefined>;
  getDisplayName(): Promise<string | undefined>;
  rename(displayName): Promise<void>;
  avatar(input, options?): Promise<void>;       // string, URL, or Buffer with mimeType
  add(users): Promise<void>;                    // member management, fire and forget
  remove(users): Promise<void>;
  leave(): Promise<void>;
  startTyping(): Promise<void>;
  stopTyping(): Promise<void>;
  responding<T>(fn): Promise<T>;                // typing indicator held for fn, cleared on throw
}
```

Unsupported actions on a platform throw `UnsupportedError` (`kind`, `platform`, `contentType`, `action`, `detail`).

## Users and creating spaces

Resolve users and create conversations through a narrowed platform instance:

```ts
const im = imessage(app);
const alice = await im.user("+15551111111");
const dm = await im.space.create(alice);
const group = await im.space.create([alice, bob]);      // where the platform supports groups
const existing = await im.space.get("any;-;+15551111111");
```

## Typing indicators

Manual: `space.startTyping()` and `space.stopTyping()`. Preferred: `space.responding(async () => { ... })`, which always clears the indicator, even on throw. Also available as `app.responding(space, fn)`.

## Custom events

Providers can emit event streams beyond messages. They appear as flat async iterables on the app (`app.typing`, `app.presence`) merged across providers, and on narrowed instances scoped to one platform (`imessage(app).typing`). Streams are created lazily on first access. Fusor providers push events with `fusorEvent(name, data)` returned from a `messages` handler.

## Lifecycle

`await app.stop()` closes the merged stream, drains custom event streams, tears down clients via `lifecycle.destroyClient`, and flushes telemetry. Spectrum registers SIGINT and SIGTERM handlers that call `stop()` with a 3 second timeout (exit 0 on clean drain, exit 1 otherwise), so Ctrl-C and `docker stop` drain cleanly with no extra wiring.
