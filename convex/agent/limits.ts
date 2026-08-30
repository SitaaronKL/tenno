import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { ConvexError } from "convex/values";
import { components } from "../_generated/api";

// Every generation is paid for, so one account cannot spend the deployment's budget on its own.
// Cast because codegen without a deployment types components loosely.
const rateLimiterComponent = components.rateLimiter as unknown as ConstructorParameters<
  typeof RateLimiter
>[0];

export const agentLimiter = new RateLimiter(rateLimiterComponent, {
  chatMessages: { kind: "fixed window", rate: 20, period: HOUR },
  ruleDrafts: { kind: "fixed window", rate: 10, period: HOUR },
});

type Ctx = Parameters<typeof agentLimiter.limit>[0];

export async function checkLimit(
  ctx: Ctx,
  name: "chatMessages" | "ruleDrafts",
  userId: string,
  friendly: string,
) {
  const status = await agentLimiter.limit(ctx, name, { key: userId });
  if (!status.ok) throw new ConvexError(friendly);
}
