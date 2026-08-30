import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoMark } from "@/components/shell/logo-mark";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  count,
  action,
  children,
  className,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
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
