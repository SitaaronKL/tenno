import Discord from "@auth/core/providers/discord";
import Resend from "@auth/core/providers/resend";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { GenericActionCtx, GenericMutationCtx } from "convex/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
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

// Email and password needs no keys, so it is always registered and the login page decides what to show.
const providers = [
  Discord,
  Resend({ from: "Voidwatch <noreply@voidwatch.app>", sendVerificationRequest: sendMagicLink }),
  password,
  ...(guestAllowed ? [Anonymous] : []),
];

// Discord reads AUTH_DISCORD_ID and AUTH_DISCORD_SECRET, the magic link goes out through convex/email.ts.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers,
  callbacks: {
    // The profile row exists from the first sign in, so delivery never waits on a settings save.
    afterUserCreatedOrUpdated: async (ctx: GenericMutationCtx<DataModel>, { userId }) => {
      await ctx.runMutation(internal.profiles.ensure, { userId });
    },
  },
});
