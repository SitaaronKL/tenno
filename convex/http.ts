import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { photonWebhook } from "./photonHttp";

const http = httpRouter();

// Mounts /api/auth/* for OAuth callbacks and magic links.
auth.addHttpRoutes(http);

// Photon delivers inbound iMessage here, the handler verifies and schedules the reply.
http.route({
  path: "/photon/webhook",
  method: "POST",
  handler: photonWebhook,
});

export default http;
