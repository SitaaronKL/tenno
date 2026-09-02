"use client";

import {
  useId,
  useRef,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
  type RefAttributes,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoMark } from "@/components/shell/logo-mark";
import { cn } from "@/lib/utils";

// Every animated icon in components/icons exposes this handle.
export type IconHandle = { startAnimation: () => void; stopAnimation: () => void };
export type PanelIcon = ComponentType<
  { size?: number; className?: string } & RefAttributes<IconHandle>
>;

// One key per panel, derived from the title so a caller never has to invent one.
export function panelKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// The saved choices live outside React, so panels read them as an external store.
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  // A second tab collapsing a panel should collapse it here too.
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

function read(name: string): boolean {
  try {
    return window.localStorage.getItem(`voidwatch.panels.${name}`) === "collapsed";
  } catch {
    return false;
  }
}

function write(name: string, collapsed: boolean) {
  try {
    window.localStorage.setItem(`voidwatch.panels.${name}`, collapsed ? "collapsed" : "open");
  } catch {
    // A blocked store just means the panel forgets, never that it breaks.
  }
  for (const fn of listeners) fn();
}

function Chevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(
        "transition-transform duration-150 ease-out motion-reduce:transition-none",
        collapsed && "-rotate-90",
      )}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function Panel({
  title,
  id,
  icon: Icon,
  count,
  action,
  children,
  className,
}: {
  title: string;
  // Stable key for the saved collapse state when the title changes with a toggle.
  id?: string;
  icon?: PanelIcon;
  count?: number | string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const icon = useRef<IconHandle>(null);
  const bodyId = useId();
  const name = panelKey(id ?? title);
  // The server snapshot is always open, so the markup matches, then the saved choice lands.
  const collapsed = useSyncExternalStore(
    subscribe,
    () => read(name),
    () => false,
  );

  return (
    <Card
      // Hover is a hairline outline plus the icon replaying, nothing moves.
      onMouseEnter={() => icon.current?.startAnimation()}
      onMouseLeave={() => icon.current?.stopAnimation()}
      className={cn(
        "gap-0 py-0 transition-shadow duration-150 ease-out hover:ring-foreground",
        className,
      )}
    >
      <CardHeader
        className={cn(
          // One min height, so a header with a control and a header with text line up when collapsed.
          "flex min-h-[3.25rem] flex-row items-center justify-between gap-2 px-4 py-3",
          !collapsed && "border-b border-border",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? <Icon ref={icon} size={16} className="text-muted-foreground" /> : null}
          <CardTitle className="truncate text-sm font-medium">{title}</CardTitle>
          {count === undefined ? null : (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted-foreground tabular-nums">
              {count}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <button
            type="button"
            onClick={() => write(name, !collapsed)}
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <Chevron collapsed={collapsed} />
          </button>
        </div>
      </CardHeader>
      {/* Rows go 1fr to 0fr, so the height animates without measuring the content. */}
      <div
        id={bodyId}
        // Collapsed content is out of reach for a pointer and for a screen reader alike.
        inert={collapsed || undefined}
        aria-hidden={collapsed || undefined}
        className={cn(
          "grid transition-[grid-template-rows] duration-150 ease-out motion-reduce:transition-none",
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="px-4 py-3 text-sm">{children}</CardContent>
        </div>
      </div>
    </Card>
  );
}

// One quiet line and the mark, never an illustration.
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <LogoMark size={28} className="opacity-40" />
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
