// STUB owned by slice 9. Slice 4 only needs the reference to compile.
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const sendEmail = internalAction({
  args: { to: v.string(), subject: v.string(), react: v.any() },
  returns: v.null(),
  handler: async () => null,
});
