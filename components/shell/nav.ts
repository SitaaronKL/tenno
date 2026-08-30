import type { ComponentType, RefAttributes } from "react";
import { LayoutGridIcon } from "@/components/icons/layout-grid";
import { WorkflowIcon } from "@/components/icons/workflow";
import { MessageCircleIcon } from "@/components/icons/message-circle";
import { SettingsIcon } from "@/components/icons/settings";

// Every animated icon exposes the same imperative handle, so the nav item can drive it on its own hover.
export type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

export type NavIcon = ComponentType<
  { size?: number; className?: string } & RefAttributes<AnimatedIconHandle>
>;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGridIcon },
  { href: "/rules", label: "Rules", icon: WorkflowIcon },
  { href: "/chat", label: "Chat", icon: MessageCircleIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

// The breadcrumb reads the route, so a label lives next to the path that produced it.
export function breadcrumbTrail(pathname: string): string[] {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, i) => {
    const href = `/${segments.slice(0, i + 1).join("/")}`;
    const item = NAV_ITEMS.find((n) => n.href === href);
    if (item) return item.label;
    return segment.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
  });
}
