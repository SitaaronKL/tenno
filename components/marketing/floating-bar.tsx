import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "#product", label: "Product" },
  { href: "#features", label: "Features" },
  { href: "#imessage", label: "iMessage" },
  { href: "#how", label: "How it works" },
];

// Frosted, centered, always on screen, so the shot behind it can stay pinned.
export function FloatingBar() {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
    >
      <div className="flex items-center gap-1 rounded-full border border-border bg-surface/70 p-1.5 shadow-lg backdrop-blur-xl">
        <ul className="hidden items-center gap-1 sm:flex">
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-foreground"
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/login"
          className={cn(buttonVariants({ size: "sm" }), "rounded-full px-4")}
        >
          Get started
        </Link>
      </div>
    </nav>
  );
}
