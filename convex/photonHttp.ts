import {
  slimEnvelopeSchema,
  verifySpectrumSignature,
} from "@spectrum-ts/core/webhook";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const LINKED = "Voidwatch linked. You will get alerts here.";
const LINK_FIRST =
  "I do not know this number yet. Add it under Settings in Voidwatch, then text me again.";

// Photon delivers the whole message lifecycle here. Only a text somebody sent us is news.
const INBOUND_EVENT = "messages";

// Photon hands us E.164 for a real person. Anything else is a Photon user id.
const E164 = /^\+\d{8,15}$/;

// Shared lines deliver registered senders as Photon user ids, the phone lives behind the API.
async function resolvePhone(photonUserId: string): Promise<string | undefined> {
  const id = process.env.SPECTRUM_PROJECT_ID;
  const secret = process.env.SPECTRUM_PROJECT_SECRET;
  if (!id || !secret) return undefined;
  try {
    const res = await fetch(
      `https://spectrum.photon.codes/projects/${id}/users/${photonUserId}/`,
      { headers: { Authorization: "Basic " + btoa(`${id}:${secret}`) } },
    );
    const body = (await res.json()) as {
      succeed: boolean;
      data?: { phoneNumber?: string };
    };
    const phone = body.data?.phoneNumber;
    return res.ok && body.succeed && phone && E164.test(phone) ? phone : undefined;
  } catch {
    return undefined;
  }
}

// The portable verify entry runs in the Convex isolate, app.webhook needs Node.
export const photonWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.PHOTON_WEBHOOK_SECRET;
  if (!secret) return new Response("not configured", { status: 500 });

  const raw = new Uint8Array(await request.arrayBuffer());
  console.log("photon webhook hit", request.headers.get("x-spectrum-event") ?? "no-event-header");
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const verified = await verifySpectrumSignature({ headers, rawBody: raw, secret });
  if (!verified.ok) {
    const status = verified.reason === "missing-headers" ? 400 : 401;
    return new Response(verified.reason, { status });
  }

  // A correctly signed body can still be nonsense, that is the sender's problem, not a crash.
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const parsed = slimEnvelopeSchema.safeParse(body);
  if (!parsed.success) return new Response("bad payload", { status: 400 });

  const envelope = parsed.data;
  const message = envelope.message;
  const content = message.content as { type: string; text?: string };
  // Our own replies come back through this webhook, answering them would loop.
  const inbound =
    envelope.event === INBOUND_EVENT && (message.direction ?? "inbound") === "inbound";
  const senderId = message.sender?.id;
  if (!inbound || content.type !== "text" || !content.text || !senderId) {
    return new Response(null, { status: 200 });
  }

  let phone = senderId;
  if (!E164.test(phone)) {
    const resolved = await resolvePhone(senderId);
    if (!resolved) {
      // No phone, no identity. Tell them how to link rather than guessing at an owner.
      await ctx.scheduler.runAfter(0, internal.photon.sendText, {
        photonUserId: senderId,
        text: LINK_FIRST,
      });
      return new Response(null, { status: 200 });
    }
    phone = resolved;
  }

  const { duplicate, firstContact } = await ctx.runMutation(internal.profiles.linkInbound, {
    messageId: message.id,
    phone,
    spaceId: message.space.id,
    senderId,
  });
  // A redelivery is already answered, saying so again would text the user twice.
  if (duplicate) return new Response(null, { status: 200 });
  if (firstContact) {
    await ctx.scheduler.runAfter(0, internal.photon.sendText, {
      phone,
      text: LINKED,
    });
  } else {
    // Reply after the 200 so Photon never waits on the agent.
    await ctx.scheduler.runAfter(0, internal.photon.reply, {
      phone,
      text: content.text,
    });
  }
  return new Response(null, { status: 200 });
});
