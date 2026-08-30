import { LogInIcon } from "@/components/icons/login";
import { SendIcon } from "@/components/icons/send";
import { LogoMark } from "@/components/shell/logo-mark";

// The mark stands in for the agent, no sparkle icons anywhere.
const STEPS = [
  { icon: LogInIcon, title: "Sign in", body: "Discord or a magic link. No password to remember." },
  { icon: null, title: "Say what you want", body: "Build a rule in the sentence builder, or just tell the agent." },
  { icon: SendIcon, title: "Get pinged", body: "Email or iMessage the moment it shows up in the world state." },
];

export function HowItWorks() {
  return (
    <section className="border-y border-border bg-surface px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong ring-1 ring-primary/25">
                  {Icon ? <Icon size={16} aria-hidden="true" /> : <LogoMark size={16} />}
                </span>
                <div>
                  <p className="font-medium">
                    <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                    {s.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
