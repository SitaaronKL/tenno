import Discord from "@auth/core/providers/discord";
import Resend from "@auth/core/providers/resend";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth } from "@convex-dev/auth/server";
import type { GenericActionCtx } from "convex/server";
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

// Discord reads AUTH_DISCORD_ID and AUTH_DISCORD_SECRET, the magic link goes out through convex/email.ts.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Discord,
    Resend({ from: "Voidwatch <noreply@voidwatch.app>", sendVerificationRequest: sendMagicLink }),
    // Dev only: lets us click through the app before the Discord and Resend keys exist.
    Anonymous,
  ],
});
