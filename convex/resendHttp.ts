import { httpAction } from "./_generated/server";
import { resend } from "./email";

// The component verifies the Resend signature itself, it needs RESEND_WEBHOOK_SECRET set.
export const resendWebhook = httpAction(async (ctx, request) => {
  return await resend.handleResendEventWebhook(ctx, request);
});
