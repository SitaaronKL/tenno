"use client";

import { cn } from "@/lib/utils";
import { absolute, countdown, spoken } from "./format";

// Under five minutes is the "act now" threshold across the dashboard.
export const SOON_MS = 5 * 60_000;

export function Countdown({
  target,
  now,
  verb = "expires",
  className,
}: {
  target: number;
  now: number;
  verb?: string;
  className?: string;
}) {
  const soon = target - now <= SOON_MS;
  return (
    <span
      title={absolute(target)}
      className={cn(
        "shrink-0 whitespace-nowrap font-mono text-xs tabular-nums",
        soon ? "text-warning" : "text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden="true">{countdown(target, now)}</span>
      <span className="sr-only">
        {verb} in {spoken(target, now)}
      </span>
    </span>
  );
}
