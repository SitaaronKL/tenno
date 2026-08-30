"use client";

import { usePathname } from "next/navigation";

import Link from "next/link";
import { LogInIcon } from "@/components/icons/login";
import { SettingsIcon } from "@/components/icons/settings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useMe } from "./useMe";

// The account card sits at the bottom of the rail and collapses to just the avatar.
export function UserCard() {
  const me = useMe();
  const pathname = usePathname();
  const name = me?.name ?? me?.email ?? "Voidwatch";

  // The dashboard is public, so a signed out visitor gets a way in, not an account menu.
  if (me === null) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            tooltip="Sign in"
            render={<Link href="/login" />}
            className="group-data-[collapsible=icon]:p-1!"
          >
            <Avatar className="size-8 rounded-full group-data-[collapsible=icon]:size-6">
              <AvatarFallback className="rounded-full">
                <LogInIcon size={16} />
              </AvatarFallback>
            </Avatar>
            <span className="grid flex-1 text-left leading-tight">
              <span className="truncate font-medium">Sign in</span>
              <span className="truncate text-xs text-muted-foreground">
                to set up alerts
              </span>
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          tooltip="Settings"
          isActive={pathname.startsWith("/settings")}
          render={<Link href="/settings" aria-label="Account and settings" />}
          className="group-data-[collapsible=icon]:p-1!"
        >
          <Avatar className="size-8 rounded-full group-data-[collapsible=icon]:size-6">
            {me?.image ? <AvatarImage src={me.image} alt="" /> : null}
            <AvatarFallback className="rounded-full">
              {name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="grid min-w-0 flex-1 text-left leading-tight">
            <span className="truncate font-medium">{name}</span>
            {me?.email && me.email !== name ? (
              <span className="truncate text-xs text-muted-foreground">
                {me.email}
              </span>
            ) : null}
          </span>
          <SettingsIcon
            size={16}
            className="ml-auto shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
