import { LogIn, Sparkles, Send } from "lucide-react";

const STEPS = [
  { icon: LogIn, title: "Sign in", body: "Discord or a magic link. No password to remember." },
  { icon: Sparkles, title: "Say what you want", body: "Build a rule in the form, or just tell the agent." },
  { icon: Send, title: "Get pinged", body: "Email or iMessage the moment it appears in the world state." },
];

export function HowItWorks() {
  return (
    <section className="border-y border-border bg-muted/20 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-400/10 text-sky-300 ring-1 ring-sky-400/30">
                <s.icon className="size-4" />
              </div>
              <div>
                <p className="font-medium">
                  <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                  {s.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
