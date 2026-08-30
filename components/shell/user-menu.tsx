"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronsUpDownIcon } from "lucide-react";
import { LogInIcon } from "@/components/icons/login";
import { LogoutIcon } from "@/components/icons/logout";
import { MoonIcon } from "@/components/icons/moon";
import { SettingsIcon } from "@/components/icons/settings";
import { SunIcon } from "@/components/icons/sun";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useMe } from "./useMe";

// The account card sits at the bottom of the rail and collapses to just the avatar.
export function UserCard() {
  const { signOut } = useAuthActions();
  const { resolvedTheme, setTheme } = useTheme();
  const { isMobile } = useSidebar();
  const router = useRouter();
  const me = useMe();
  const name = me?.name ?? me?.email ?? "Voidwatch";
  const dark = resolvedTheme === "dark";

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
              <span className="truncate text-xs text-muted-foreground">to set up alerts</span>
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" aria-label="Account menu" tooltip={name} className="group-data-[collapsible=icon]:p-1!" />
            }
          >
            <Avatar className="size-8 rounded-full group-data-[collapsible=icon]:size-6">
              {me?.image ? <AvatarImage src={me.image} alt="" /> : null}
              <AvatarFallback className="rounded-full">{name.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="grid flex-1 text-left leading-tight">
              <span className="truncate font-medium">{name}</span>
              {me?.email ? (
                <span className="truncate text-xs text-muted-foreground">{me.email}</span>
              ) : null}
            </span>
            <ChevronsUpDownIcon className="ml-auto" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "top" : "right"}
            align="end"
            className="w-56 min-w-56"
          >
            <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings" />}>
              <SettingsIcon size={16} />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(dark ? "light" : "dark")}>
              {dark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
              {dark ? "Light theme" : "Dark theme"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
            >
              <LogoutIcon size={16} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
