import { cn } from "@/lib/utils";

export const TIERS = ["Lith", "Meso", "Neo", "Axi", "Requiem", "Omnia"] as const;
export type Tier = (typeof TIERS)[number];

// Relic colors are the ones players already read in game.
const TONE: Record<string, string> = {
  Lith: "bg-surface-2 text-muted-foreground ring-border",
  Meso: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300",
  Neo: "bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300",
  Axi: "bg-accent-soft text-accent-strong ring-primary/25",
  Requiem: "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300",
  Omnia: "bg-foreground/8 text-foreground ring-foreground/20",
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
