import { ConvexError } from "convex/values";

// ConvexError carries its message to the browser, everything else reads as "Server Error".
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ConvexError) {
    return typeof error.data === "string" ? error.data : fallback;
  }
  return fallback;
}
