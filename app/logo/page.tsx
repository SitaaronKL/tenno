// Logo candidates. Temporary page, visit /logo during npm run dev. Delete before launch.
const marks: { name: string; note: string; svg: React.ReactNode }[] = [
  {
    name: "Void Sigil",
    note: "Relic silhouette with a fissure crack. Reads at 16px.",
    svg: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
        <path d="M32 4 L54 18 L54 46 L32 60 L10 46 L10 18 Z" />
        <path d="M32 14 L44 22 L44 42 L32 50 L20 42 L20 22 Z" opacity=".5" />
        <path d="M30 20 L36 32 L28 36 L34 48" strokeWidth="3.5" stroke="#f5b942" />
      </svg>
    ),
  },
  {
    name: "Tenno Bell",
    note: "Notification bell built from a Lotus petal shape.",
    svg: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 8 C44 8 50 20 50 32 L50 42 L56 48 L8 48 L14 42 L14 32 C14 20 20 8 32 8 Z" />
        <path d="M32 8 L32 20" />
        <path d="M26 54 A6 6 0 0 0 38 54" />
        <circle cx="48" cy="14" r="6" fill="#f5b942" stroke="none" />
      </svg>
    ),
  },
  {
    name: "Orbit Clock",
    note: "Countdown ring with a planet tick. Timers are the core.",
    svg: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <circle cx="32" cy="32" r="24" opacity=".35" />
        <path d="M32 8 A24 24 0 1 1 8 32" stroke="#f5b942" strokeWidth="4" />
        <path d="M32 32 L32 18 M32 32 L42 38" />
        <circle cx="32" cy="32" r="3" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "Fissure T",
    note: "Letter T split by a void crack. Wordmark friendly.",
    svg: (
      <svg viewBox="0 0 64 64" fill="none">
        <path d="M10 12 H54 V22 H38 V54 H26 V22 H10 Z" fill="currentColor" />
        <path d="M30 12 L34 24 L28 34 L35 44 L30 54" stroke="#f5b942" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "Signal Lotus",
    note: "Three petals as broadcast waves. Alerts going out.",
    svg: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M32 56 C20 44 20 28 32 16 C44 28 44 44 32 56 Z" />
        <path d="M14 40 C10 30 14 20 22 14" opacity=".6" />
        <path d="M50 40 C54 30 50 20 42 14" opacity=".6" />
        <path d="M8 30 C6 22 10 14 16 8" opacity=".3" />
        <path d="M56 30 C58 22 54 14 48 8" opacity=".3" />
        <circle cx="32" cy="36" r="3" fill="#f5b942" stroke="none" />
      </svg>
    ),
  },
  {
    name: "Hex Eye",
    note: "Hexagon with a watching iris. Always on.",
    svg: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
        <path d="M32 6 L55 19 L55 45 L32 58 L9 45 L9 19 Z" />
        <path d="M16 32 C22 22 42 22 48 32 C42 42 22 42 16 32 Z" />
        <circle cx="32" cy="32" r="5" fill="#f5b942" stroke="none" />
      </svg>
    ),
  },
];

export default function LogoPage() {
  return (
    <main className="min-h-screen bg-neutral-950 p-10 text-neutral-100">
      <h1 className="text-2xl font-semibold">Tenno logo candidates</h1>
      <p className="mt-1 text-sm text-neutral-400">Accent is #f5b942 (void gold). Each mark is shown at 96px, 32px and 16px.</p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {marks.map((m) => (
          <section key={m.name} className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-end gap-6">
              <div className="h-24 w-24">{m.svg}</div>
              <div className="h-8 w-8">{m.svg}</div>
              <div className="h-4 w-4">{m.svg}</div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-7 w-7">{m.svg}</div>
              <span className="text-xl font-bold tracking-tight">tenno</span>
            </div>
            <h2 className="mt-4 font-medium">{m.name}</h2>
            <p className="text-sm text-neutral-400">{m.note}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
