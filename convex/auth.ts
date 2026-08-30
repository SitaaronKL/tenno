import Discord from "@auth/core/providers/discord";
import Resend from "@auth/core/providers/resend";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth } from "@convex-dev/auth/server";
import type { GenericActionCtx, GenericMutationCtx } from "convex/server";
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

const providers = [
  Discord,
  Resend({ from: "Voidwatch <noreply@voidwatch.app>", sendVerificationRequest: sendMagicLink }),
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
