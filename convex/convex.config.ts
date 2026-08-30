import { defineApp } from "convex/server";
import resend from "@convex-dev/resend/convex.config.js";
import agent from "@convex-dev/agent/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import workflow from "@convex-dev/workflow/convex.config.js";

const app = defineApp();
app.use(resend);
app.use(agent);
app.use(rateLimiter);
app.use(workflow);
export default app;
