// STUB for slice 7 local typecheck. Slice 1 owns this file, take slice 1's version at merge.
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config.js";

const app = defineApp();
app.use(agent);

export default app;
