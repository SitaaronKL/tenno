import Discord from "@auth/core/providers/discord";
import Resend from "@auth/core/providers/resend";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { GenericActionCtx, GenericMutationCtx } from "convex/server";
import { ConvexError } from "convex/values";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { query } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";

// Convex Auth passes the action ctx as a second argument, the Auth.js type does not know about it.
const sendMagicLink = (async (
  { identifier, url }: { identifier: string; url: string },
  ctx: GenericActionCtx<DataModel>,
) => {
  await ctx.runAction(internal.email.sendEmail, {
    to: identifier,
    subject: "Sign in to Voidwatch",
    react: { template: "MagicLink" as const, props: { url } },
  });
}) as unknown as Parameters<typeof Resend>[0]["sendVerificationRequest"];

// Guest sign in is for a deployment without Discord and Resend keys, so it is opt in.
const guestAllowed = process.env.AUTH_ALLOW_GUEST === "true";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// ConvexError carries its message to the browser, a plain Error would read as "Server Error".
const password = Password<DataModel>({
  // profile runs on every flow, so it only normalizes and checks the shape.
  profile(params) {
    const email = String(params.email ?? "").trim().toLowerCase();
    if (!EMAIL.test(email)) throw new ConvexError("Enter a valid email address.");
    return { email };
  },
  validatePasswordRequirements: (secret: string) => {
    if (secret.length < 8) throw new ConvexError("Password must be at least 8 characters.");
  },
});

// One source of truth: a provider is registered only where its secret exists, and the login page
// renders buttons from the auth.providers query rather than from its own set of public flags.
const discordConfigured = Boolean(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET);
// The magic link goes out through convex/email.ts, so it needs the Resend key, not AUTH_RESEND_KEY.
const magicLinkConfigured = (process.env.RESEND_API_KEY ?? "").trim() !== "";

// Email and password needs no keys, so it is always available.
const enabled = {
  discord: discordConfigured,
  magicLink: magicLinkConfigured,
  password: true,
  guest: guestAllowed,
};

const registered = [
  ...(discordConfigured ? [Discord] : []),
  ...(magicLinkConfigured
    ? [Resend({ from: "Voidwatch <noreply@voidwatch.app>", sendVerificationRequest: sendMagicLink })]
    : []),
  password,
  ...(guestAllowed ? [Anonymous] : []),
];

// Discord reads AUTH_DISCORD_ID and AUTH_DISCORD_SECRET, the magic link goes out through convex/email.ts.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: registered,
  callbacks: {
    // The profile row exists from the first sign in, so delivery never waits on a settings save.
    afterUserCreatedOrUpdated: async (ctx: GenericMutationCtx<DataModel>, { userId }) => {
      await ctx.runMutation(internal.profiles.ensure, { userId });
    },
  },
});

// What the login page may offer. Public by design: a signed out visitor is the only one who reads it.
export const providers = query({
  args: {},
  returns: v.object({
    discord: v.boolean(),
    magicLink: v.boolean(),
    password: v.boolean(),
    guest: v.boolean(),
  }),
  handler: async () => enabled,
});
