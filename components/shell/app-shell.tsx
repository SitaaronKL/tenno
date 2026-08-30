"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon } from "@/components/icons/menu";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo-mark";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark size={22} />
      <span className="md:sr-only lg:not-sr-only">Voidwatch</span>
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-svh flex-1">
      {/* 240px of nav, an icon rail on tablet, a Sheet below that. */}
      <aside className="hidden shrink-0 border-r border-border bg-sidebar md:flex md:w-16 md:flex-col lg:w-60">
        <div className="flex h-14 items-center px-4 md:justify-center lg:justify-start lg:px-5">
          <Link href="/dashboard" className="rounded-lg">
            <Wordmark />
          </Link>
        </div>
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-2 border-b border-border px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                aria-label="Open navigation"
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
              >
                <MenuIcon size={16} aria-hidden="true" />
              </SheetTrigger>
              <SheetContent side="left" className="w-60 p-0">
                <SheetTitle className="flex h-14 items-center px-5 text-base">
                  <Wordmark className="lg:not-sr-only" />
                </SheetTitle>
                <SidebarNav onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <Link href="/dashboard" className="md:hidden">
              <Wordmark />
            </Link>
          </div>
          <UserMenu />
        </header>
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
