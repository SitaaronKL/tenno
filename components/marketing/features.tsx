import { TimerIcon } from "@/components/icons/timer";
import { BellIcon } from "@/components/icons/bell";
import { MessageCircleIcon } from "@/components/icons/message-circle";

const FEATURES = [
  {
    icon: TimerIcon,
    title: "Live timers, no refresh",
    body: "Fissures, invasions, sorties, Baro, Nightwave and open world cycles. Pulled every five minutes and pushed to your screen the moment they change.",
  },
  {
    icon: BellIcon,
    title: "Rules, not noise",
    body: "Say exactly what you care about. Get an instant ping or an hourly digest by email or iMessage, and nothing else.",
  },
  {
    icon: MessageCircleIcon,
    title: "An agent you can text",
    body: "Ask what is worth running, search the wiki, or make a rule in plain English. Same memory on the web and in iMessage.",
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <ul className="grid gap-10 sm:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <li key={f.title}>
              <span className="mb-4 inline-flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent-strong ring-1 ring-primary/25">
                <Icon size={18} aria-hidden="true" />
              </span>
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.body}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
