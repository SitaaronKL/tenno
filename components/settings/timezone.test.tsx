import { describe, expect, it } from "vitest";
import { DEFAULT_DIGEST_HOUR, shouldAdoptTimezone } from "./timezone";

describe("timezone default", () => {
  it("adopts the browser zone while the profile still sits on the UTC default", () => {
    expect(shouldAdoptTimezone("UTC", "America/New_York")).toBe(true);
  });

  it("leaves a zone the user has already chosen alone", () => {
    expect(shouldAdoptTimezone("Europe/Berlin", "America/New_York")).toBe(false);
    expect(shouldAdoptTimezone("UTC", "UTC")).toBe(false);
  });

  it("starts the digest at nine in the morning", () => {
    expect(DEFAULT_DIGEST_HOUR).toBe(9);
  });
});
