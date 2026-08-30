import {
  slimEnvelopeSchema,
  verifySpectrumSignature,
} from "@spectrum-ts/core/webhook";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const LINKED = "Voidwatch linked. You will get alerts here.";

// The portable verify entry runs in the Convex isolate, app.webhook needs Node.
export const photonWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.PHOTON_WEBHOOK_SECRET;
  if (!secret) return new Response("not configured", { status: 500 });

  const raw = new Uint8Array(await request.arrayBuffer());
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const verified = await verifySpectrumSignature({ headers, rawBody: raw, secret });
  if (!verified.ok) {
    const status = verified.reason === "missing-headers" ? 400 : 401;
    return new Response(verified.reason, { status });
  }

  const parsed = slimEnvelopeSchema.safeParse(
    JSON.parse(new TextDecoder().decode(raw)),
  );
  if (!parsed.success) return new Response("bad payload", { status: 400 });

  const message = parsed.data.message;
  const content = message.content as { type: string; text?: string };
  const senderId = message.sender?.id ?? message.space.id;
  if (content.type === "text" && content.text && senderId) {
    const { duplicate, firstContact } = await ctx.runMutation(internal.profiles.linkInbound, {
      messageId: message.id,
      phone: senderId,
      spaceId: message.space.id,
      senderId,
    });
    // A redelivery is already answered, saying so again would text the user twice.
    if (duplicate) return new Response(null, { status: 200 });
    if (firstContact) {
      await ctx.scheduler.runAfter(0, internal.photon.sendText, {
        phone: senderId,
        text: LINKED,
      });
    } else {
      // Reply after the 200 so Photon never waits on the agent.
      await ctx.scheduler.runAfter(0, internal.photon.reply, {
        phone: senderId,
        text: content.text,
      });
    }
  }
  return new Response(null, { status: 200 });
});
