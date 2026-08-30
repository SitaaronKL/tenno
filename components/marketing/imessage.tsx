import { Logo } from "@/components/shell/logo";
import { cn } from "@/lib/utils";

type Message = { from: "me" | "them"; text: string };

const THREAD: Message[] = [
  { from: "me", text: "any axi survival up right now?" },
  { from: "them", text: "Yes, one Axi Survival on Mot, Void, for another 42 minutes. Steel Path is up too." },
  { from: "me", text: "text me whenever that happens" },
  { from: "them", text: "Done. New rule: Axi Survival fissures, instant, iMessage. Reply stop to pause it." },
];

// The classic Messages tail, drawn rather than pulled from a library, see shell.questions.md.
function Tail({ mine }: { mine: boolean }) {
  return (
    <svg
      viewBox="0 0 12 20"
      width="12"
      height="20"
      aria-hidden="true"
      className={
        mine
          ? "absolute right-[-6px] bottom-0 fill-[#0b84ff]"
          : "absolute bottom-0 left-[-6px] scale-x-[-1] fill-[#e9e9eb] dark:fill-[#26252a]"
      }
    >
      <path d="M0 20V0c0 8 1 13 6 16 3 2 5 3 6 4H0Z" />
    </svg>
  );
}

export function IMessageMock() {
  return (
    <section id="imessage" className="scroll-mt-24 border-t border-border px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-[16ch] font-display text-4xl leading-tight sm:text-5xl">
          It already lives where you text
        </h2>
        <p className="mt-4 max-w-lg text-muted-foreground">
          Link your phone once. Every alert and every answer arrives as an ordinary message.
        </p>

        <div className="mt-12 flex justify-center">
          <div className="w-full max-w-[22rem] rounded-[3rem] border border-border bg-surface-2 p-2.5 shadow-2xl">
            <div className="overflow-hidden rounded-[2.4rem] bg-background">
              <div className="flex flex-col items-center gap-1 border-b border-border px-4 pt-3 pb-2">
                <span className="mb-1 h-1.5 w-24 rounded-full bg-border" />
                <span className="flex size-11 items-center justify-center rounded-full bg-surface-2">
                  <Logo size={22} />
                </span>
                <p className="text-xs font-medium">Voidwatch</p>
              </div>

              <ol className="space-y-0.5 px-3 py-4">
                <li className="pb-2 text-center text-[11px] text-muted-foreground">
                  <span className="font-semibold">Today</span> 9:41 AM
                </li>
                {THREAD.map((m, i) => {
                  const mine = m.from === "me";
                  const last = THREAD[i + 1]?.from !== m.from;
                  return (
                    <li key={m.text} className={mine ? "flex justify-end pt-1" : "flex justify-start pt-1"}>
                      <span
                        className={cn(
                          "relative max-w-[78%] rounded-[1.15rem] px-3.5 py-2 text-[15px] leading-5",
                          mine
                            ? "bg-[#0b84ff] text-white"
                            : "bg-[#e9e9eb] text-[#0a0a0a] dark:bg-[#26252a] dark:text-[#f5f5f5]",
                          last && (mine ? "rounded-br-md" : "rounded-bl-md"),
                        )}
                      >
                        {m.text}
                        {last ? <Tail mine={mine} /> : null}
                      </span>
                    </li>
                  );
                })}
                <li className="pt-2 text-right text-[11px] text-muted-foreground">Delivered</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
