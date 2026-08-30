import { AsciiLogo } from "./ascii-logo";

const FEATURES = [
  {
    title: "Live timers, no refresh",
    body: "Fissures, invasions, sorties, Baro, Nightwave and open world cycles, pulled every five minutes and pushed to your screen the moment they change.",
  },
  {
    title: "Rules, not noise",
    body: "Say exactly what you care about. Get an instant ping or an hourly digest by email or iMessage, and nothing else.",
  },
  {
    title: "An agent you can text",
    body: "Ask what is worth running, search the wiki, or make a rule in plain English. Same memory on the web and in Messages.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 border-t border-border px-6 py-24">
      <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[320px_1fr] lg:gap-24">
        <div className="flex flex-col items-start gap-4">
          <AsciiLogo size={320} />
          <p className="font-mono text-xs text-muted-foreground">The void, one character at a time</p>
        </div>
        <ul className="divide-y divide-border">
          {FEATURES.map((f) => (
            <li key={f.title} className="grid gap-2 py-8 first:pt-0 sm:grid-cols-[1fr_2fr] sm:gap-10">
              <h3 className="font-display text-2xl leading-tight">{f.title}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
