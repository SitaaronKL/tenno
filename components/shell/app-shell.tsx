"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { breadcrumbTrail } from "./nav";

function RouteBreadcrumb() {
  const pathname = usePathname();
  const trail = breadcrumbTrail(pathname);
  const segments = pathname.split("/").filter(Boolean);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden sm:block">
          <BreadcrumbLink render={<Link href="/dashboard" />}>Voidwatch</BreadcrumbLink>
        </BreadcrumbItem>
        {trail.map((label, i) => (
          <Fragment key={`${i}-${label}`}>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem>
              {i === trail.length - 1 ? (
                <BreadcrumbPage>{label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link href={`/${segments.slice(0, i + 1).join("/")}`} />}>
                  {label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <RouteBreadcrumb />
        </header>
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 md:px-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
