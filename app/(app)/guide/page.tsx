import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-medium tracking-tight">{title}</h2>
      <div className="grid gap-2 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

// Plain prose on purpose: the guide is read once, it should read like a person explaining the app.
export default function GuidePage() {
  return (
    <>
      <PageHeader title="Guide" helper="What Voidwatch does and how to get the most out of it." />
      <div className="grid max-w-2xl gap-10 pb-16">
        <Section title="World state">
          <p>
            The dashboard shows everything happening in Warframe right now: fissures, bounties,
            invasions, alerts, the sortie and Archon Hunt, Nightwave, Archimedea, open world cycles,
            Baro and the weeklies. It refreshes on its own, timers count down live, and nothing needs
            a reload.
          </p>
          <p>
            Every box, bounty board and cycle tile can be turned off under Settings, and the fissures
            box remembers your default view there too, like Steel Path only with the highest tier on
            top.
          </p>
        </Section>

        <Section title="Notifications">
          <p>
            A rule says what you care about, Voidwatch watches for it and pings you the moment it
            happens. Instant is the default, a daily digest exists if you ask for one. Rules deliver
            by email or iMessage.
          </p>
          <p>
            The fastest way to make one is describing it: press New rule on the Notifications page,
            say something like &ldquo;steel path omnia void cascade&rdquo;, and the chat takes it from
            there, asking only for whatever is missing. A manual form exists under the same button if
            you would rather pick every field yourself.
          </p>
        </Section>

        <Section title="iMessage">
          <p>
            Voidwatch can text you, and you can text it back. Save your number under{" "}
            <Link href="/settings" className="text-foreground underline underline-offset-4">
              Settings
            </Link>{" "}
            and text START to the number shown there. The first text links your phone, everything
            after that is a conversation with the same agent as the web chat, same memory included.
          </p>
        </Section>

        <Section title="Chat">
          <p>
            The chat knows the live world state, the wiki, and your rules. Ask what is worth running,
            have it make or list rules, or ask it to draft a build. Every conversation lives in the
            history, and archiving one tucks it away at the bottom of Settings.
          </p>
          <p>
            <Link href="/chat" className="text-foreground underline underline-offset-4">
              Open the chat
            </Link>{" "}
            and ask it anything.
          </p>
        </Section>

        <Section title="Builds, Mastery and Resources">
          <p>
            Builds holds your loadouts with a mod editor, and the chat can draft one for a goal in
            plain English. Mastery tracks what you have leveled against everything in the game.
            Resources keeps count of what you are farming toward.
          </p>
        </Section>

        <Section title="Free, forever">
          <p>
            All of it is free, no paywall, no ads. If something is broken or missing, say so in the
            chat, it gets read.
          </p>
        </Section>
      </div>
    </>
  );
}
