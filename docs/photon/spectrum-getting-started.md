# Spectrum getting started (spectrum-ts)

Source: /docs/spectrum-ts/getting-started, /docs/spectrum-ts/introduction

`spectrum-ts` is a unified messaging SDK for TypeScript. Write agent logic once, deliver it across iMessage, WhatsApp Business, Telegram, terminal, or a custom platform. Requires TypeScript 5 or later.

## Install

```bash
npm install spectrum-ts        # batteries included, standard provider set
# or leaner:
bun add @spectrum-ts/core @spectrum-ts/imessage @spectrum-ts/telegram
```

The `spectrum-ts/providers/<platform>` import paths work as long as the matching provider package is installed. Local iMessage is the exception: install `@spectrum-ts/imessage-local` explicitly and import `localIMessage` from that scoped package (macOS only, reads the Messages SQLite database, never install it in cloud deployments).

## Credentials

`PROJECT_ID` and `SECRET_KEY` come from project Settings on https://app.photon.codes. Pass them to `Spectrum(...)` or set `SPECTRUM_PROJECT_ID` and `SPECTRUM_PROJECT_SECRET` env vars. `webhookSecret` falls back to `SPECTRUM_WEBHOOK_SECRET`. Every provider config text field falls back to `SPECTRUM_<PLATFORM>_<FIELD>` (for example `SPECTRUM_TELEGRAM_BOT_TOKEN`, `SPECTRUM_WHATSAPP_BUSINESS_PHONE_NUMBER_ID`). Explicit config always wins over env.

## First app

```ts
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";

const app = await Spectrum({
  projectId: "your-project-id",
  projectSecret: "your-project-secret",
  providers: [imessage.config()],
});

for await (const [space, message] of app.messages) {
  if (message.content.type === "text") {
    await space.send("hello world");
  }
}
```

Projectless providers like `terminal` work without credentials.

## The app instance

`Spectrum()` returns a `SpectrumInstance`:

```ts
app.messages                      // AsyncIterable<[Space, Message]>, merged across providers
await app.send(space, content)    // send into a space
await app.responding(space, fn)   // run fn wrapped in a typing indicator
await app.webhook(req, handler)   // handle an inbound webhook delivery
await app.stop()                  // graceful shutdown, idempotent
```

`message.platform` identifies the source provider. Custom provider events surface as flat async iterables on the same object, for example `app.typing`.

## Logging and telemetry

- `options: { logLevel: "debug" }` on the `Spectrum()` call; explicit level beats the `LOG_LEVEL` env var. Logs redact tokens and secrets.
- `telemetry: true` enables OpenTelemetry tracing (init, provider setup, send and receive, space resolution, custom events). Traces go to the Photon OTLP endpoint by default; standard `OTEL_EXPORTER_OTLP_*` env vars override. `app.stop()` flushes pending telemetry.

## Support

Email ryan@photon.codes for integration support. Spectrum skills for AI coding tools: https://www.skills.sh/photon-hq/skills/spectrum
