// STUB for slice 7 local typecheck. Slice 1 owns this file, take slice 1's version at merge.
import { getAuthUserId } from "@convex-dev/auth/server";
import type { GenericActionCtx, GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";

type AnyCtx =
  | GenericQueryCtx<DataModel>
  | GenericMutationCtx<DataModel>
  | GenericActionCtx<DataModel>;

export async function requireUser(ctx: AnyCtx): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  return userId as string;
}
