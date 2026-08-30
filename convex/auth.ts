import Discord from "@auth/core/providers/discord";
import Resend from "@auth/core/providers/resend";
import { convexAuth } from "@convex-dev/auth/server";

// Discord reads AUTH_DISCORD_ID and AUTH_DISCORD_SECRET, Resend reads AUTH_RESEND_KEY.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Discord, Resend({ from: "Tenno <noreply@tenno.app>" })],
});
