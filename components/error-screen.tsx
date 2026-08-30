import Link from "next/link";

import { AsciiText } from "@/components/ascii-text";
import { buttonVariants } from "@/components/ui/button";

export function ErrorScreen({
  code,
  title,
  body,
  action,
}: {
  code: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-6 text-center text-foreground">
      <AsciiText text={code} />
      <div className="space-y-2">
        <h1 className="font-display text-3xl">{title}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      </div>
      <div className="flex gap-3">
        {action}
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to Voidwatch
        </Link>
      </div>
    </main>
  );
}
