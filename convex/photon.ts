"use node";

import { v } from "convex/values";
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";

const API = "https://spectrum.photon.codes";

function projectAuth() {
  const id = process.env.SPECTRUM_PROJECT_ID;
  const secret = process.env.SPECTRUM_PROJECT_SECRET;
  if (!id || !secret) throw new Error("Photon project env vars are missing");
  return { id, header: "Basic " + btoa(`${id}:${secret}`) };
}

// Cached at module scope so warm invocations skip the gRPC handshake.
let clientPromise: ReturnType<typeof createClient> | undefined;

async function createClient() {
  const { id } = projectAuth();
  return await Spectrum({
    projectId: id,
    projectSecret: process.env.SPECTRUM_PROJECT_SECRET!,
    providers: [imessage.config()],
    webhookSecret: process.env.PHOTON_WEBHOOK_SECRET,
  });
}

async function client() {
  clientPromise ??= createClient();
  return await clientPromise;
}

async function photonFetch(path: string, init?: RequestInit) {
  const { id, header } = projectAuth();
  const res = await fetch(`${API}/projects/${id}${path}`, {
    ...init,
    headers: { Authorization: header, "Content-Type": "application/json" },
  });
  const body = (await res.json()) as {
    succeed: boolean;
    data?: { id: string; phoneNumber: string };
    message?: string;
  };
  if (!res.ok || !body.succeed || !body.data) {
    throw new Error(`Photon API failed: ${body.message ?? res.status}`);
  }
  return body.data;
}

// Adds the phone to the shared line so Photon will accept traffic for it.
export const registerUser = internalAction({
  args: { phone: v.string() },
  returns: v.string(),
  handler: async (_ctx, { phone }) => {
    const user = await photonFetch("/users/", {
      method: "POST",
      body: JSON.stringify({ type: "shared", phoneNumber: phone }),
    });
    return user.id;
  },
});

// The user opted in through a conversation, keep writing into it instead of opening a new one.
async function spaceFor(ctx: ActionCtx, handle: string) {
  const im = imessage(await client());
  const known = await ctx.runQuery(internal.profiles.photonSpace, { phone: handle });
  if (known?.spaceId) return await im.space.get(known.spaceId);

  const space = await im.space.create(handle);
  if (known) {
    await ctx.runMutation(internal.profiles.storePhotonSpaceId, {
      profileId: known.profileId,
      spaceId: space.id,
    });
  }
  return space;
}

export const sendText = internalAction({
  args: {
    photonUserId: v.optional(v.string()),
    phone: v.optional(v.string()),
    text: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { photonUserId, phone, text }) => {
    let handle = phone;
    if (!handle && photonUserId) {
      handle = (await photonFetch(`/users/${photonUserId}/`)).phoneNumber;
    }
    if (!handle) throw new Error("sendText needs a phone or a photonUserId");
    const space = await spaceFor(ctx, handle);
    await space.send(text);
    return null;
  },
});

export const reply = internalAction({
  args: { phone: v.string(), text: v.string() },
  returns: v.null(),
  handler: async (ctx, { phone, text }) => {
    const answer = await ctx.runAction(internal.agent.chat.replyToInbound, { phone, text });
    const space = await spaceFor(ctx, phone);
    await space.send(answer);
    return null;
  },
});
