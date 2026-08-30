// STUB owned by slice 1. Slice 4 needs requireUser to compile.
import type { GenericQueryCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";

export async function requireUser(ctx: GenericQueryCtx<DataModel>): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not signed in");
  return identity.subject;
}
