# Building a custom platform

Source: /docs/spectrum-ts/custom-platforms

`definePlatform(id, definition)` returns a callable provider that exposes `.config()` for registration on `Spectrum()` and acts as the narrowing function (`myPlatform(app)`, `myPlatform(space)`, `myPlatform(message)`). The platform id is stable and developer facing: it appears on `message.platform` and `__platform`, and drives registration, webhook routing, telemetry, and the `SPECTRUM_<ID>_<FIELD>` env prefix.

## Definition shape

| Field | Required | Description |
| --- | --- | --- |
| `name` | Yes | Platform id |
| `config` | Yes | Zod schema for provider config |
| `lifecycle.createClient` | Yes | Creates the client; receives `config`, `projectConfig`, `projectId`, `projectSecret`, `store` |
| `lifecycle.destroyClient` | No | Teardown on shutdown |
| `messages` | Yes | Inbound stream: async generator receiving `{ client, config, projectConfig, store }`, yields message records |
| `send` | Yes | `({ space, content, client, config, store }) => Promise<ProviderMessageRecord | undefined>`; single dispatch point for every content type. Return `undefined` for fire and forget signals |
| `user.resolve` | Yes | String id to user, at minimum `{ id }` |
| `user.schema` | No | Zod schema for extra user fields |
| `space.create` | Yes | Users (plus optional params) to a resolved space |
| `space.get` | No | Hydrate a space from a known id; required when `space.schema` demands more than `{ id }` |
| `space.schema`, `space.params` | No | Zod schemas for extra space fields and create/get params |
| `space.actions` | No | Platform specific space methods; space is auto bound as first arg. Reserved Space names are skipped with a warning |
| `message.schema` | No | Extra typed fields on incoming messages, surfaced through narrowing |
| `message.actions` | No | Per message sugar bound to the message itself; reserved Message names skipped |
| `actions` | No | Instance methods. Framework recognized names `getMessage`, `getMembers`, `getAvatar`, `getDisplayName` power the universal Space methods (default throws UnsupportedError). Free form keys become platform specific methods (like iMessage's `getAttachment`). Framework injects `{ client, config, store }` as first arg |
| `events` | No | Extra event streams, surfaced as `app.<name>` and on the narrowed instance |
| `static` | No | Constants copied onto the returned provider |

## Message direction

Records yielded from `messages` are wrapped inbound; records returned from `send` are wrapped outbound. A provider can set `direction` on a raw record to override, which matters for nested records like reaction targets (inbound reaction, outbound target). Without it, nested targets inherit the outer record's direction.

## Event producers

Every producer receives `{ client, config, projectConfig, store }` and returns an `AsyncIterable`. The core `messages` stream is top level; custom streams live in `events` and are auto wired as `app.presence` style flat properties, merged across providers or scoped through the narrowed instance.

## Fusor backed providers (webhook driven platforms)

When inbound arrives by webhook rather than a persistent connection, use `fusor(...)` as the client in `lifecycle.createClient`. The Fusor client handles webhook signature verification and hands parsed payloads to a per delivery `messages` handler receiving `{ config, payload, projectConfig, respond, store }`; call `respond()` to set the HTTP response. Return `fusorEvent(name, data)` (or an array mixing messages and events) to push custom events into `app.<name>` streams. Undeclared event names produce a runtime warning.

## Registering

```ts
const app = await Spectrum({ providers: [myPlatform.config({ apiKey: process.env.MY_KEY! })] });
const mine = myPlatform(app);
const user = await mine.user("user-123");
const space = await mine.space.create(user);
```
