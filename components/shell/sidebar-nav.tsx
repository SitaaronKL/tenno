"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5 p-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={item.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-foreground md:justify-center lg:justify-start",
              active && "bg-accent-soft text-accent-strong hover:bg-accent-soft hover:text-accent-strong",
            )}
          >
            <Icon size={16} className="shrink-0" aria-hidden="true" />
            {/* The label stays in the accessible name when the rail collapses to icons. */}
            <span className="truncate md:sr-only lg:not-sr-only">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
