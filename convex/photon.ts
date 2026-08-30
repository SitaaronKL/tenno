// STUB owned by slice 9. Slice 4 only needs the reference to compile.
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const sendText = internalAction({
  args: { photonUserId: v.optional(v.string()), phone: v.optional(v.string()), text: v.string() },
  returns: v.null(),
  handler: async () => null,
});
