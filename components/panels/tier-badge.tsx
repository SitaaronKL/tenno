import { cn } from "@/lib/utils";

export const TIERS = ["Lith", "Meso", "Neo", "Axi", "Requiem", "Omnia"] as const;
export type Tier = (typeof TIERS)[number];

// Relic colors are the ones players already read in game.
const TONE: Record<string, string> = {
  Lith: "bg-surface-2 text-muted-foreground ring-border",
  Meso: "bg-sky-400/10 text-sky-300 ring-sky-400/25",
  Neo: "bg-violet-400/10 text-violet-300 ring-violet-400/25",
  Axi: "bg-accent-soft text-primary ring-primary/25",
  Requiem: "bg-red-400/10 text-red-300 ring-red-400/25",
  Omnia: "bg-white/10 text-foreground ring-white/20",
};

export function TierBadge({ tier }: { tier: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-16 shrink-0 justify-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
        TONE[tier] ?? TONE.Lith,
      )}
    >
      {tier}
    </span>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground ring-1 ring-border">
      {children}
    </span>
  );
}
