import { Bell, MessageCircle, Timer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TIMERS = [
  { label: "Axi Survival, Steel Path", meta: "Fissure", left: "42m" },
  { label: "Baro Ki'Teer at Strata Relay", meta: "Void Trader", left: "1d 6h" },
  { label: "Orokin Catalyst Blueprint", meta: "Invasion, Ceres", left: "3h 10m" },
  { label: "Cetus day cycle", meta: "Plains of Eidolon", left: "58m" },
];

const RULES = [
  { name: "Axi fissures, Survival or Defense", filter: "fissure: tier Axi, steel path", channel: "iMessage" },
  { name: "Catalyst or Reactor invasions", filter: "invasion: reward Orokin Catalyst, Orokin Reactor", channel: "Email" },
  { name: "Baro brings Primed Chamber", filter: "baro: items Primed Chamber", channel: "iMessage" },
];

const CHAT = [
  { from: "me", text: "any axi survival up right now?" },
  { from: "tenno", text: "Yes, one Axi Survival on Mot (Void) for another 42 minutes. Steel Path is available too." },
  { from: "me", text: "text me whenever that happens" },
  { from: "tenno", text: "Done. New rule: Axi Survival fissures, instant, iMessage. Reply stop to pause it." },
];

function Section({
  icon: Icon,
  title,
  body,
  children,
  flip,
}: {
  icon: typeof Timer;
  title: string;
  body: string;
  children: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className={`grid items-center gap-10 lg:grid-cols-2 ${flip ? "lg:[&>*:first-child]:order-2" : ""}`}>
      <div>
        <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300 ring-1 ring-sky-400/30">
          <Icon className="size-5" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        <p className="mt-3 text-muted-foreground leading-7">{body}</p>
      </div>
      {children}
    </div>
  );
}

export function Features() {
  return (
    <section className="mx-auto max-w-6xl space-y-28 px-6 py-20">
      <Section
        icon={Timer}
        title="Live timers, no refresh"
        body="Fissures, invasions, sorties, Baro, Nightwave and open world cycles, pulled every five minutes and pushed to your screen the moment they change."
      >
        <Card>
          <CardHeader>
            <CardTitle>Right now on PC</CardTitle>
            <CardDescription>Updates live, sorted by what expires first.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {TIMERS.map((t) => (
                <li key={t.label} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.meta}</p>
                  </div>
                  <span className="font-mono text-sm tabular-nums text-sky-300">{t.left}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </Section>

      <Section
        flip
        icon={Bell}
        title="Custom notifiers, your rules"
        body="Describe exactly what you care about. Get an instant ping or an hourly digest by email or iMessage, and nothing else."
      >
        <Card>
          <CardHeader>
            <CardTitle>Example rules</CardTitle>
            <CardDescription>Structured filters, matched against every new event.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {RULES.map((r) => (
              <div key={r.name} className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{r.name}</p>
                  <Badge variant="secondary">{r.channel}</Badge>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{r.filter}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </Section>

      <Section
        icon={MessageCircle}
        title="Text the agent"
        body="Ask what is up, search the wiki, or create a rule in plain English. The agent lives in iMessage and on the web, same memory in both."
      >
        <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-border bg-black/40 p-4 shadow-2xl">
          <p className="mb-4 text-center text-xs text-muted-foreground">Voidwatch</p>
          <ol className="space-y-2">
            {CHAT.map((m, i) => (
              <li key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-5 ${
                    m.from === "me" ? "bg-sky-500 text-white" : "bg-neutral-700 text-neutral-50"
                  }`}
                >
                  {m.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Section>
    </section>
  );
}
