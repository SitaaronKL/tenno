import { LogoMark } from "@/components/shell/logo-mark";

const TILES = [
  { world: "Cetus", state: "Night", left: "18:42" },
  { world: "Orb Vallis", state: "Warm", left: "07:11" },
  { world: "Cambion Drift", state: "Fass", left: "24:03" },
  { world: "Zariman", state: "Corpus", left: "41:20" },
];

const ROWS = [
  { tier: "Axi", mission: "Survival", node: "Mot, Void", left: "42m 10s" },
  { tier: "Meso", mission: "Defense", node: "Xini, Eris", left: "21m 04s" },
  { tier: "Lith", mission: "Capture", node: "Tessera, Venus", left: "9m 55s" },
];

// A composed shot of the real dashboard layout, see polish.questions.md.
export function ProductShot() {
  return (
    <section className="px-6">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-t-xl bg-surface ring-1 ring-border">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="ml-3 flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-xs text-muted-foreground">
            <LogoMark size={12} /> voidwatch.app/dashboard
          </span>
        </div>
        <div className="grid gap-4 p-5 pb-16">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TILES.map((t) => (
              <div key={t.world} className="rounded-xl bg-card p-3 text-left ring-1 ring-border">
                <p className="truncate text-xs text-muted-foreground">{t.world}</p>
                <p className="mt-1 text-sm font-medium">{t.state}</p>
                <p className="font-mono text-xs text-muted-foreground tabular-nums">{t.left}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-card ring-1 ring-border">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-medium">
              Fissures
              <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                {ROWS.length}
              </span>
            </div>
            <ul className="divide-y divide-border">
              {ROWS.map((r) => (
                <li key={r.node} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="w-14 shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-center text-xs text-primary ring-1 ring-primary/25">
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
        </div>
      </div>
    </section>
  );
}
