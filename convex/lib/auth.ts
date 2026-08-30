import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";

type AuthCtx = { auth: { getUserIdentity: () => Promise<unknown> } };

// Every public function starts here, so userId is never taken as an argument.
export async function requireUser(ctx: AuthCtx): Promise<{ userId: Id<"users"> }> {
  const userId = await getAuthUserId(ctx as never);
  if (userId === null) {
    throw new ConvexError("Not signed in");
  }
  return { userId };
}
