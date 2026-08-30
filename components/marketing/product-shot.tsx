import { Logo } from "@/components/shell/logo";

const TILES = [
  { world: "Cetus", state: "Night", left: "18:42" },
  { world: "Orb Vallis", state: "Warm", left: "07:11" },
  { world: "Cambion Drift", state: "Fass", left: "24:03" },
  { world: "Zariman", state: "Corpus", left: "41:20" },
  { world: "Earth", state: "Day", left: "52:09" },
  { world: "Duviri", state: "Joy", left: "05:38" },
];

const FISSURES = [
  { tier: "Axi", mission: "Survival", node: "Mot, Void", left: "42m 10s" },
  { tier: "Meso", mission: "Defense", node: "Xini, Eris", left: "21m 04s" },
  { tier: "Lith", mission: "Capture", node: "Tessera, Venus", left: "9m 55s" },
  { tier: "Neo", mission: "Exterminate", node: "Ukko, Void", left: "6m 12s" },
];

const NAV = ["World state", "Rules", "Chat", "Mastery"];

const SIDE_CARDS = [
  {
    title: "Sortie",
    rows: [
      ["Grineer, Sealab", "Sabotage"],
      ["Grineer, Asteroid", "Assassination"],
      ["Ends in", "14:22:09"],
    ] as [string, string][],
  },
  {
    title: "Baro Ki Teer",
    rows: [
      ["Next relay", "Larunda, Mercury"],
      ["Arrives in", "3d 04:11"],
      ["Last visit", "Primed Flow"],
    ] as [string, string][],
  },
];

// A composed shot of the real dashboard layout, it stays pinned while the page scrolls past it.
export function ProductShot() {
  return (
    <section id="product" className="scroll-mt-24 px-6 pb-24">
      <div className="mx-auto max-w-6xl lg:h-[165vh]">
        <div className="lg:sticky lg:top-16">
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="mx-auto flex items-center gap-2 rounded-md bg-surface-2 px-3 py-1 text-xs text-muted-foreground">
                <Logo size={12} /> voidwatch.app/dashboard
              </span>
            </div>

            <div className="flex">
              <div className="hidden w-44 shrink-0 border-r border-border p-3 sm:block">
                <p className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold tracking-tight">
                  <Logo size={16} /> Voidwatch
                </p>
                <ul className="mt-4 space-y-0.5">
                  {NAV.map((label, i) => (
                    <li
                      key={label}
                      className={
                        i === 0
                          ? "rounded-md bg-surface-2 px-2 py-1.5 text-sm font-medium"
                          : "px-2 py-1.5 text-sm text-muted-foreground"
                      }
                    >
                      {label}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="min-w-0 flex-1 space-y-4 p-5">
                <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
                  {TILES.map((t) => (
                    <div key={t.world} className="rounded-lg border border-border bg-card p-3">
                      <p className="truncate text-xs text-muted-foreground">{t.world}</p>
                      <p className="mt-1 text-sm font-medium">{t.state}</p>
                      <p className="font-mono text-xs text-muted-foreground tabular-nums">{t.left}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-medium">
                    Fissures
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {FISSURES.length}
                    </span>
                  </div>
                  <ul className="divide-y divide-border">
                    {FISSURES.map((r) => (
                      <li key={r.node} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        <span className="w-14 shrink-0 rounded-md border border-border px-2 py-0.5 text-center text-xs">
                          {r.tier}
                        </span>
                        <span className="font-medium">{r.mission}</span>
                        <span className="truncate text-muted-foreground">{r.node}</span>
                        <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
                          {r.left}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {SIDE_CARDS.map((c) => (
                    <div key={c.title} className="rounded-lg border border-border bg-card">
                      <div className="border-b border-border px-4 py-3 text-sm font-medium">{c.title}</div>
                      <dl className="divide-y divide-border">
                        {c.rows.map((r) => (
                          <div key={r[0]} className="flex items-center justify-between px-4 py-2.5 text-sm">
                            <dt className="text-muted-foreground">{r[0]}</dt>
                            <dd className="font-mono text-xs tabular-nums">{r[1]}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
