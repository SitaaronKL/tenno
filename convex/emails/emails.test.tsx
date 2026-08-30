import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { Digest } from "./Digest";
import { MagicLink } from "./MagicLink";
import { RuleMatch } from "./RuleMatch";

describe("email templates", () => {
  it("tells the reader which rule matched and what to do", async () => {
    const html = await render(
      <RuleMatch
        ruleName="Axi survival"
        kind="fissure"
        title="Axi Survival on Sedna"
        detail="Steel Path"
        expiresAt="in 40 minutes"
        url="https://voidwatch.app/dashboard"
      />,
      { plainText: true },
    );
    // Plain text rendering upper cases headings, the words are what matters.
    expect(html.toLowerCase()).toContain("axi survival on sedna");
    expect(html).toContain("Your rule Axi survival matched a fissure");
    expect(html).toContain("Steel Path");
    expect(html).toContain("in 40 minutes");
    expect(html).toContain("Open Voidwatch");
  });

  it("lists every alert in the digest with its count", async () => {
    const html = await render(
      <Digest
        items={[
          { ruleName: "Baro", title: "Baro arrives", detail: "Primed Chamber" },
          { ruleName: "Invasions", title: "Catalyst invasion" },
        ]}
        url="https://voidwatch.app/dashboard"
      />,
      { plainText: true },
    );
    expect(html).toContain("2 alerts matched your rules this hour");
    expect(html).toContain("Baro arrives");
    expect(html).toContain("Primed Chamber");
    expect(html).toContain("Catalyst invasion");
  });

  it("gives the sign in link and says it expires", async () => {
    const html = await render(<MagicLink url="https://voidwatch.app/magic?t=abc" />, {
      plainText: false,
    });
    expect(html).toContain("Sign in to Voidwatch");
    expect(html).toContain("https://voidwatch.app/magic?t=abc");
    expect(html).toContain("expires in 15 minutes");
  });
});
