import type { ReactNode } from "react";

// Title left, one line of helper text under it, primary action right.
export function PageHeader({
  title,
  helper,
  action,
}: {
  title: string;
  helper?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 lg:flex-nowrap">
      <div className="min-w-64 flex-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {helper ? <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{helper}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}
