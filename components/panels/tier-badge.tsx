import { cn } from "@/lib/utils";

export const TIERS = ["Lith", "Meso", "Neo", "Axi", "Requiem", "Omnia"] as const;
export type Tier = (typeof TIERS)[number];

// Relic order the way the game lists it, so the table reads Lith first and Omnia last.
export function tierRank(tier: string): number {
  const i = (TIERS as readonly string[]).indexOf(tier);
  return i === -1 ? TIERS.length : i;
}

// Black and white only, weight and ring carry the emphasis instead of hue.
export function TierBadge({ tier }: { tier: string }) {
  const known = tierRank(tier) < TIERS.length;
  return (
    <span
      className={cn(
        "inline-flex w-16 shrink-0 justify-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
        known
          ? "bg-accent-soft text-foreground ring-foreground/20"
          : "bg-surface-2 text-muted-foreground ring-border",
      )}
    >
      {tier}
    </span>
  );
}

export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground ring-1 ring-border",
        className,
      )}
    >
      {children}
    </span>
  );
}
