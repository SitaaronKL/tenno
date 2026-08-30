# HTTP Actions

Public HTTP endpoints served at `https://<deployment>.convex.site/...` (the `.site` domain; `CONVEX_SITE_URL` env
var inside functions; `NEXT_PUBLIC_CONVEX_SITE_URL` is a convention you set yourself).

```ts
// convex/http.ts  (exact filename; must default-export the router)
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/postMessage",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { author, body } = await request.json();
    await ctx.runMutation(internal.messages.send, { author, body });
    return new Response(null, { status: 200 });
  }),
});

http.route({
  pathPrefix: "/getAuthorMessages/",   // matches /getAuthorMessages/<anything>
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const author = new URL(request.url).pathname.split("/").pop()!;
    const messages = await ctx.runQuery(internal.messages.byAuthor, { author });
    return Response.json(messages);
  }),
});

export default http;
```

- Handler = standard Fetch API `(ctx: ActionCtx, request: Request) => Promise<Response>`. Body via
  `.json()/.text()/.blob()/.arrayBuffer()`.
- `ctx` is an action context: `ctx.runQuery/runMutation/runAction`, `ctx.storage`, `ctx.auth`, `ctx.scheduler`,
  `fetch`. No direct `ctx.db`.
- Request/response bodies limited to 20 MiB (use upload URLs for larger files).
- Not retried; side effects are caller's responsibility.
- Optional global prefix: `httpPrefix` in `convex.config.ts`; components can mount routes via `app.use(c, { httpPrefix: "/x/" })`.

## Auth in HTTP actions
Client sends `Authorization: Bearer <JWT>` (Convex Auth: `useAuthToken()`; Clerk: `getToken({ template: "convex" })`).
Then `const identity = await ctx.auth.getUserIdentity();` works as in other functions.

## CORS
```ts
http.route({
  path: "/sendImage", method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    const h = request.headers;
    if (h.get("Origin") && h.get("Access-Control-Request-Method") && h.get("Access-Control-Request-Headers")) {
      return new Response(null, { headers: new Headers({
        "Access-Control-Allow-Origin": process.env.CLIENT_ORIGIN!,
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Digest, Authorization",
        "Access-Control-Max-Age": "86400",
      }) });
    }
    return new Response();
  }),
});
// and on the real response: "Access-Control-Allow-Origin": process.env.CLIENT_ORIGIN!, Vary: "origin"
```
`convex-helpers/server/cors` provides `corsRouter(http, { allowedOrigins })` to avoid boilerplate.

## Webhooks (Stripe/Resend/Clerk…)
Read raw body with `await request.text()` *before* parsing, verify signature with the vendor SDK using the raw
string, then `ctx.runMutation(internal....)`. Return 200 quickly; do heavy work via `ctx.scheduler`.
`@convex-dev/resend` ships `resend.handleResendEventWebhook(ctx, req)` for this.

## Convex Auth routes
`auth.addHttpRoutes(http)` mounts `/api/auth/signin/*`, `/api/auth/callback/*`, `/.well-known/openid-configuration`,
`/.well-known/jwks.json`.

## Gotchas
- `path` and `pathPrefix` are mutually exclusive; prefix must end with `/`.
- Streaming responses are supported (`new Response(readableStream)`).
- Debug via Dashboard → Logs (HTTP actions appear as `POST /path`).
