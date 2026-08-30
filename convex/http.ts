import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Mounts /api/auth/* for OAuth callbacks and magic links.
auth.addHttpRoutes(http);

/* ---------------------------------------------------------------
 * SLICE 9: add the Photon inbound webhook here.
 *   http.route({ path: "/photon/webhook", method: "POST", handler: ... })
 * Keep it inside this block so slice 1 and slice 9 do not conflict.
 * --------------------------------------------------------------- */

export default http;
