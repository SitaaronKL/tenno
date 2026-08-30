"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-svh flex-1">
      <aside className="hidden w-56 shrink-0 border-r md:flex md:flex-col">
        <div className="px-5 py-4 text-base font-semibold">Tenno</div>
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                aria-label="Open navigation"
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
              >
                <Menu className="size-4" aria-hidden="true" />
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <SheetTitle className="px-5 py-4 text-base font-semibold">Tenno</SheetTitle>
                <SidebarNav onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <Link href="/dashboard" className="text-base font-semibold md:hidden">
              Tenno
            </Link>
          </div>
          <UserMenu />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
