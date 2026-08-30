import { cn } from "@/lib/utils";

// Inline, not an <img>, so the white strokes follow currentColor and flip with the theme.
export function LogoMark({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      strokeLinecap="round"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <circle cx="32" cy="32" r="8" stroke="#f5b942" strokeWidth="5" />
      <path d="M13.2 25.2 A20 20 0 0 1 42 14.7" stroke="currentColor" strokeWidth="5" />
      <path d="M50.8 38.8 A20 20 0 0 1 22 49.3" stroke="#f5b942" strokeWidth="5" />
      <path d="M50 14 L39 25 M25 39 L14 50" stroke="currentColor" strokeWidth="5" />
    </svg>
  );
}
