"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Logo } from "./logo";
import { NAV_ITEMS, type AnimatedIconHandle, type NavItem } from "./nav";
import { UserCard } from "./user-menu";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const icon = useRef<AnimatedIconHandle>(null);
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={item.href} aria-current={active ? "page" : undefined} />}
        isActive={active}
        tooltip={item.label}
        // Holding the ref hands control to us, so hovering anywhere on the row runs the icon.
        onMouseEnter={() => icon.current?.startAnimation()}
        onMouseLeave={() => icon.current?.stopAnimation()}
        onFocus={() => icon.current?.startAnimation()}
        onBlur={() => icon.current?.stopAnimation()}
      >
        <Icon ref={icon} size={16} />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Voidwatch"
              render={<Link href="/" />}
              className="h-12 group-data-[collapsible=icon]:h-8"
            >
              <Logo className="size-6 group-data-[collapsible=icon]:size-4" />
              <span className="font-semibold tracking-tight">Voidwatch</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserCard />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
