"use client";

import { cn } from "@/lib/utils";

// One segmented control, used by Steel Path and by the theme picker.
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <span
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex rounded-full bg-surface-2 p-0.5 align-middle ring-1 ring-border", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-sm transition-colors duration-150 ease-out",
            value === o.value
              ? "bg-accent-soft text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}
