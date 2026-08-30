// Logo candidates. Temporary page, visit /logo during npm run dev. Delete before launch.
const G = "#f5b942";
const marks: { name: string; note: string; svg: React.ReactNode }[] = [
  {
    name: "Event Horizon",
    note: "A black disc with a thin gold ring, one gap at 12 o clock. The void, and a clock face.",
    svg: (
      <svg viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="26" fill="currentColor" />
        <circle cx="32" cy="32" r="18" fill="var(--bg, #0a0a0a)" />
        <path d="M32 8 A24 24 0 1 1 31.9 8" stroke={G} strokeWidth="3" strokeLinecap="round" strokeDasharray="140 12" />
        <circle cx="32" cy="32" r="4" fill={G} />
      </svg>
    ),
  },
  {
    name: "Watcher",
    note: "Almond eye, iris is a void portal. Gold pupil is the thing it found.",
    svg: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round">
        <path d="M6 32 C18 14 46 14 58 32 C46 50 18 50 6 32 Z" />
        <circle cx="32" cy="32" r="10" fill="currentColor" stroke="none" />
        <circle cx="32" cy="32" r="10" stroke={G} strokeWidth="2.5" />
        <circle cx="35" cy="29" r="3" fill={G} stroke="none" />
      </svg>
    ),
  },
  {
    name: "Tear",
    note: "A void tear: two curved edges with light leaking through. Fissure without the cliche crack.",
    svg: (
      <svg viewBox="0 0 64 64" fill="none">
        <path d="M22 6 C40 20 40 44 22 58 L42 58 C24 44 24 20 42 6 Z" fill={G} />
        <path d="M26 6 C42 20 42 44 26 58" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M38 6 C22 20 22 44 38 58" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "Sentinel",
    note: "Minimal radar sweep in a square with rounded corners. App icon ready.",
    svg: (
      <svg viewBox="0 0 64 64" fill="none">
        <rect x="4" y="4" width="56" height="56" rx="14" fill="currentColor" />
        <circle cx="32" cy="32" r="18" stroke="var(--bg, #0a0a0a)" strokeWidth="2" opacity=".5" />
        <circle cx="32" cy="32" r="9" stroke="var(--bg, #0a0a0a)" strokeWidth="2" opacity=".5" />
        <path d="M32 32 L32 12 A20 20 0 0 1 49 22 Z" fill={G} opacity=".9" />
        <circle cx="32" cy="32" r="3" fill={G} />
      </svg>
    ),
  },
  {
    name: "V Monogram",
    note: "V for Voidwatch drawn as an open chevron, gold dot sits in the notch like a pointer.",
    svg: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 14 L32 50 L54 14" />
        <circle cx="32" cy="24" r="5" fill={G} stroke="none" />
      </svg>
    ),
  },
  {
    name: "Orbit Pair",
    note: "Two rings on a tilt, like a Warframe orbiter lens. Gold node marks the next event.",
    svg: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3">
        <ellipse cx="32" cy="32" rx="26" ry="10" transform="rotate(-30 32 32)" />
        <ellipse cx="32" cy="32" rx="26" ry="10" transform="rotate(30 32 32)" opacity=".5" />
        <circle cx="32" cy="32" r="6" fill="currentColor" stroke="none" />
        <circle cx="51" cy="18" r="4" fill={G} stroke="none" />
      </svg>
    ),
  },
];

const names: { name: string; why: string; tagline: string }[] = [
  { name: "Tenno", why: "What every player is called. Short, known, the current repo name. Risk: generic, many Tenno.* apps exist.", tagline: "Your Warframe, always on" },
  { name: "Ordis", why: "The ship AI that nags you about the world. Perfect for a notifier that texts you. Risk: DE owns the character name.", tagline: "Operator, a fissure has appeared" },
  { name: "Cephalon", why: "The class of AIs in the game. Fits an agent product, less trademark heat than Ordis.", tagline: "Your personal Cephalon" },
  { name: "Voidwatch", why: "Original, descriptive: it watches the void for you. Clean domain odds.", tagline: "We watch the void so you can play" },
  { name: "Relay", why: "In game hubs where Baro visits. Also literally what the app does: relays events to you.", tagline: "Every event, relayed to you" },
  { name: "Lotus Line", why: "The Lotus guides you over comms, and you text a line. Two words, wordmark friendly.", tagline: "Text the Lotus" },
];

export default function LogoPage() {
  return (
    <main className="min-h-screen bg-neutral-950 p-10 text-neutral-100" style={{ ["--bg" as string]: "#0a0a0a" }}>
      <h1 className="text-2xl font-semibold">Voidwatch logo candidates</h1>
      <p className="mt-1 text-sm text-neutral-400">Accent is #f5b942 (void gold). Each mark is shown at 96px, 32px and 16px.</p>
      <h2 className="mt-10 text-lg font-medium">Vortex direction (from your Nano Banana pick)</h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"><img src="/logo-ideas/vortex.jpg" alt="original" className="w-full rounded" /><p className="mt-2 text-sm text-neutral-400">Original render</p></section>
        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"><img src="/logo-ideas/vortex-traced-transparent.svg" alt="traced" className="w-full rounded" /><p className="mt-2 text-sm text-neutral-400">Auto trace, now the main logo (public/logo.svg)</p></section>
        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"><img src="/logo-rebuilt.svg" alt="rebuilt" className="w-full rounded" /><p className="mt-2 text-sm text-neutral-400">Geometric rebuild, kept as an alternate</p></section>
        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="flex items-end gap-5"><img src="/logo-mark.svg" alt="" className="h-24 w-24" /><img src="/logo-mark.svg" alt="" className="h-8 w-8" /><img src="/logo-mark.svg" alt="" className="h-4 w-4" /></div>
          <div className="mt-4 flex items-center gap-3"><img src="/logo-mark.svg" alt="" className="h-7 w-7" /><span className="text-xl font-bold tracking-tight">voidwatch</span></div>
          <p className="mt-2 text-sm text-neutral-400">Small mark for favicon and nav, public/logo-mark.svg</p>
        </section>
      </div>
      <h2 className="mt-10 text-lg font-medium">Names</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {names.map((n, i) => (
          <section key={n.name} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8">{marks[i % marks.length].svg}</div>
              <span className="text-2xl font-bold tracking-tight">{n.name.toLowerCase()}</span>
            </div>
            <p className="mt-2 text-sm italic text-neutral-300">{n.tagline}</p>
            <p className="mt-2 text-sm text-neutral-400">{n.why}</p>
          </section>
        ))}
      </div>
      <h2 className="mt-10 text-lg font-medium">Marks</h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {marks.map((m) => (
          <section key={m.name} className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-end gap-6">
              <div className="h-24 w-24">{m.svg}</div>
              <div className="h-8 w-8">{m.svg}</div>
              <div className="h-4 w-4">{m.svg}</div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-7 w-7">{m.svg}</div>
              <span className="text-xl font-bold tracking-tight">voidwatch</span>
            </div>
            <h2 className="mt-4 font-medium">{m.name}</h2>
            <p className="text-sm text-neutral-400">{m.note}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
