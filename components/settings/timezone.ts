export const DEFAULT_TIMEZONE = "UTC";
// Nine in the morning, local, is the digest hour a new profile gets.
export const DEFAULT_DIGEST_HOUR = 9;

// Intl throws in a browser with no zone database, so UTC is the floor.
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

// A profile still on the UTC default has never been saved, so the browser zone is the better guess.
export function shouldAdoptTimezone(saved: string, detected: string): boolean {
  return saved === DEFAULT_TIMEZONE && detected !== DEFAULT_TIMEZONE;
}
