import Image from "next/image";
import { cn } from "@/lib/utils";

export const TIERS = ["Lith", "Meso", "Neo", "Axi", "Requiem", "Omnia"] as const;
export type Tier = (typeof TIERS)[number];

// Relic order the way the game lists it, so the table reads Lith first and Omnia last.
export function tierRank(tier: string): number {
  const i = (TIERS as readonly string[]).indexOf(tier);
  return i === -1 ? TIERS.length : i;
}

// The one hue in the app: the metal each relic is named for, text and ring only.
const TIER_STYLE: Record<Tier, string> = {
  Lith: "text-[#b87333] ring-[#b87333]/45",
  Meso: "text-[#a8b0b8] ring-[#a8b0b8]/45",
  Neo: "text-[#d4a017] ring-[#d4a017]/45",
  Axi: "text-[#e8e8ec] ring-[#e8e8ec]/45",
  Requiem: "text-[#c03a3a] ring-[#c03a3a]/45",
  // Omnia takes every relic, so it takes every color, see app/globals.css.
  Omnia: "tier-omnia ring-0",
};

export function TierBadge({ tier }: { tier: string }) {
  const known = tierRank(tier) < TIERS.length;
  return (
    <span
      className={cn(
        "relative inline-flex w-[5.5rem] shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium ring-1",
        known ? TIER_STYLE[tier as Tier] : "bg-surface-2 text-muted-foreground ring-border",
      )}
    >
      {known ? (
        <Image
          src={`/relics/${tier.toLowerCase()}.png`}
          alt={tier}
          width={16}
          height={16}
          className="size-4 shrink-0"
        />
      ) : null}
      {/* The icon already carries the name, so the word is decoration for a screen reader. */}
      <span aria-hidden="true" className="truncate">
        {tier}
      </span>
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
