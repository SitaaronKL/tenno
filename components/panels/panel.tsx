"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
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

function read(name: string): boolean | null {
  try {
    const saved = window.localStorage.getItem(`voidwatch.panels.${name}`);
    return saved === null ? null : saved === "collapsed";
  } catch {
    return null;
  }
}

function write(name: string, collapsed: boolean) {
  try {
    window.localStorage.setItem(`voidwatch.panels.${name}`, collapsed ? "collapsed" : "open");
  } catch {
    // A blocked store just means the panel forgets, never that it breaks.
  }
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
  icon: Icon,
  count,
  action,
  children,
  className,
}: {
  title: string;
  icon?: PanelIcon;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const icon = useRef<IconHandle>(null);
  const bodyId = useId();
  const name = panelKey(title);
  // Server and first paint always render open, the saved choice lands right after mount.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const saved = read(name);
    if (saved !== null) setCollapsed(saved);
  }, [name]);

  function toggle() {
    setCollapsed((was) => {
      write(name, !was);
      return !was;
    });
  }

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
          "flex flex-row items-center justify-between gap-2 px-4 py-3",
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
            onClick={toggle}
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
