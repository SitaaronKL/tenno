# Convex Auth (`@convex-dev/auth`)

Auth implemented *inside* your Convex deployment (no third-party auth service). Beta. Supports:
Passwords (with verification/reset), OAuth (any Auth.js provider), Magic links & OTPs (email; SMS via custom provider).
Works with React SPA, Next.js (App Router), React Native.

Packages: `@convex-dev/auth` (0.0.95), `@auth/core` (docs pin `@auth/core@0.41.1`; 0.41.3 is latest).

## Setup
```sh
npm install @convex-dev/auth @auth/core@0.41.1
npx @convex-dev/auth        # scaffolds files below + sets SITE_URL, JWT_PRIVATE_KEY, JWKS env vars
```
Manual equivalents:
```ts
// convex/auth.config.ts
export default {
  providers: [{ domain: process.env.CONVEX_SITE_URL, applicationID: "convex" }],
};

// convex/auth.ts
import { convexAuth } from "@convex-dev/auth/server";
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({ providers: [] });

// convex/http.ts
import { httpRouter } from "convex/server";
import { auth } from "./auth";
const http = httpRouter();
auth.addHttpRoutes(http);   // mounts /api/auth/* (OAuth callbacks etc.)
export default http;

// convex/schema.ts
import { authTables } from "@convex-dev/auth/server";
export default defineSchema({
  ...authTables,   // users, authSessions, authAccounts, authRefreshTokens, authVerificationCodes, authVerifiers, authRateLimits
  // extend users: users: defineTable({ ...authTables.users.validator.fields, role: v.optional(v.string()) }).index("email", ["email"]),
});
```
Env vars (Convex deployment): `SITE_URL` (your frontend origin incl. port), `JWT_PRIVATE_KEY`, `JWKS`
(generate with `jose`: `generateKeyPair("RS256")` → `exportPKCS8` / `exportJWK`). `convex/tsconfig.json` needs
`"moduleResolution": "Bundler"`, `"skipLibCheck": true`.

React SPA client:
```tsx
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
<ConvexAuthProvider client={convex}><App /></ConvexAuthProvider>
```
Next.js: see 12-nextjs.md (`ConvexAuthNextjsServerProvider` + `ConvexAuthNextjsProvider` + middleware).

## Email / password
```ts
// convex/auth.ts
import { Password } from "@convex-dev/auth/providers/Password";
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // optional:
      verify: ResendOTP,            // email verification provider (see OTP below)
      reset: ResendOTPPasswordReset, // password reset provider
      validatePasswordRequirements: (pw: string) => { if (pw.length < 12) throw new ConvexError("Too short"); },
      profile(params) {              // map form fields → user doc; validate email (e.g. with zod)
        return { email: params.email as string, name: params.name as string };
      },
    }),
  ],
});
```
```tsx
const { signIn } = useAuthActions();
const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
<form onSubmit={(e) => { e.preventDefault(); void signIn("password", new FormData(e.currentTarget)); }}>
  <input name="email" type="email" /><input name="password" type="password" />
  <input name="flow" type="hidden" value={flow} />
  <button type="submit">{flow === "signIn" ? "Sign in" : "Sign up"}</button>
</form>
```
`flow` values: `"signUp"`, `"signIn"`, `"email-verification"` (with `code`), `"reset"` (email only),
`"reset-verification"` (email + `code` + `newPassword`). `signIn(...)` resolves `{ signingIn: boolean }`; when
verification is required it resolves `signingIn: false` and you show the code form.

## OAuth (GitHub, Google, Apple, …)
```ts
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({ providers: [GitHub, Google] });
```
```sh
npx convex env set AUTH_GITHUB_ID ...   ; npx convex env set AUTH_GITHUB_SECRET ...
npx convex env set AUTH_GOOGLE_ID ...   ; npx convex env set AUTH_GOOGLE_SECRET ...
```
- Callback URL in the provider console: `https://<deployment>.convex.site/api/auth/callback/github` (**`.site`**, not `.cloud`).
- Client: `signIn("github", { redirectTo: "/dashboard" })`. Keep separate OAuth apps for dev vs prod.

## Magic links (Resend)
```ts
import Resend from "@auth/core/providers/resend";
convexAuth({ providers: [Resend({ from: "My App <noreply@mydomain.com>" })] });
// npx convex env set AUTH_RESEND_KEY re_...
```
Client: `signIn("resend", formData)` with an `email` field. Consider an interstitial "confirm" page when the link is
opened, to mitigate session fixation. Note: Convex Auth's magic link uses the **Auth.js Resend provider directly**,
not the `@convex-dev/resend` component.

## OTP (email code) — custom provider
```ts
// convex/ResendOTP.ts
import { Email } from "@convex-dev/auth/providers/Email";
import { Resend as ResendAPI } from "resend";
import { alphabet, generateRandomString } from "oslo/crypto"; // or @oslojs/crypto

export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 15,
  async generateVerificationToken() { return generateRandomString(8, alphabet("0-9")); },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: "My App <noreply@mydomain.com>", to: [email], subject: "Sign in code", text: `Your code is ${token}`,
    });
    if (error) throw new Error(JSON.stringify(error));
  },
});
```
Client two-step: `signIn("resend-otp", { email })` then `signIn("resend-otp", { email, code })`. Failed attempts
are rate-limited automatically.

## Using auth in functions
```ts
import { getAuthUserId, getAuthSessionId } from "@convex-dev/auth/server";
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);      // Id<"users"> | null
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});
```
`ctx.auth.getUserIdentity()` also works (`subject` = `"<userId>|<sessionId>"`). In HTTP actions, clients send
`Authorization: Bearer <token>` where token comes from `useAuthToken()`.

## Client helpers
- `useAuthActions()` → `{ signIn, signOut }`; `useConvexAuth()` → `{ isLoading, isAuthenticated }`.
- `<Authenticated>`, `<Unauthenticated>`, `<AuthLoading>` from `convex/react` for conditional rendering.
- `signIn(provider, paramsOrFormData)`; `signOut()`.

## Gotchas
- Beta API; pin the version. Auth tables are in *your* schema; don't rename them.
- `SITE_URL` must match the frontend origin exactly (port included) — OAuth redirects and magic links break otherwise.
- The `users` table is yours: `authTables.users` has `name`, `image`, `email`, `emailVerificationTime`, `phone`,
  `phoneVerificationTime`, `isAnonymous` — all optional. Add an `.index("email", ["email"])` if you extend it.
- With Next.js, cookies are used → never perform side effects on GET server handlers (CSRF).
- For production, separate deployments need their own `JWT_PRIVATE_KEY`/`JWKS`/`SITE_URL`/OAuth secrets.
