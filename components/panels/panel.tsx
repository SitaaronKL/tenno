"use client";

import { useRef, type ComponentType, type ReactNode, type RefAttributes } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoMark } from "@/components/shell/logo-mark";
import { cn } from "@/lib/utils";

// Every animated icon in components/icons exposes this handle.
export type IconHandle = { startAnimation: () => void; stopAnimation: () => void };
export type PanelIcon = ComponentType<
  { size?: number; className?: string } & RefAttributes<IconHandle>
>;

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
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? <Icon ref={icon} size={16} className="text-muted-foreground" /> : null}
          <CardTitle className="truncate text-sm font-medium">{title}</CardTitle>
          {count === undefined ? null : (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted-foreground tabular-nums">
              {count}
            </span>
          )}
        </div>
        {action}
      </CardHeader>
      <CardContent className="px-4 py-3 text-sm">{children}</CardContent>
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
