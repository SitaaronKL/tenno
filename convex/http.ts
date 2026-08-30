import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { photonWebhook } from "./photonHttp";
import { resendWebhook } from "./resendHttp";

const http = httpRouter();

// Mounts /api/auth/* for OAuth callbacks and magic links.
auth.addHttpRoutes(http);

// Photon delivers inbound iMessage here, the handler verifies and schedules the reply.
http.route({
  path: "/photon/webhook",
  method: "POST",
  handler: photonWebhook,
});

// Resend reports delivery, bounces and complaints here, so a queued email becomes sent or failed.
http.route({
  path: "/resend/webhook",
  method: "POST",
  handler: resendWebhook,
});

export default http;
