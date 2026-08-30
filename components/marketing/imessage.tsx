const CHAT = [
  { from: "me", text: "any axi survival up right now?" },
  {
    from: "voidwatch",
    text: "Yes, one Axi Survival on Mot, Void, for another 42 minutes. Steel Path is up too.",
  },
  { from: "me", text: "text me whenever that happens" },
  {
    from: "voidwatch",
    text: "Done. New rule: Axi Survival fissures, instant, iMessage. Reply stop to pause it.",
  },
];

// The pitch is that the agent lives in Messages, so the pitch is a Messages thread.
export function IMessageMock() {
  return (
    <section className="px-6 pb-24">
      <div className="mx-auto w-full max-w-sm rounded-[2.5rem] bg-surface p-3 ring-1 ring-border">
        <div className="rounded-[2rem] bg-background p-4">
          <p className="mb-4 text-center text-xs text-muted-foreground">Voidwatch</p>
          <ol className="space-y-2">
            {CHAT.map((m) => (
              <li key={m.text} className={m.from === "me" ? "flex justify-end" : "flex justify-start"}>
                <p
                  className={
                    m.from === "me"
                      ? "max-w-[80%] rounded-2xl bg-primary px-3.5 py-2 text-sm leading-5 text-primary-foreground"
                      : "max-w-[80%] rounded-2xl bg-surface-2 px-3.5 py-2 text-sm leading-5"
                  }
                >
                  {m.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
