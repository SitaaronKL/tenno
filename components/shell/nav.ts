import type { ComponentType, RefAttributes } from "react";
import { LayoutGridIcon } from "@/components/icons/layout-grid";
import { WorkflowIcon } from "@/components/icons/workflow";
import { MessageCircleIcon } from "@/components/icons/message-circle";
import { AtomIcon } from "@/components/icons/atom";
import { HammerIcon } from "@/components/icons/hammer";
import { PackageIcon } from "@/components/icons/package";
import { EarthIcon } from "@/components/icons/earth";

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
  { href: "/dashboard", label: "World state", icon: LayoutGridIcon },
  { href: "/rules", label: "Notifications", icon: WorkflowIcon },
  { href: "/builds", label: "Builds", icon: HammerIcon },
  { href: "/chat", label: "Chat", icon: MessageCircleIcon },
  { href: "/resources", label: "Resources", icon: PackageIcon },
  { href: "/mastery", label: "Mastery", icon: AtomIcon },
  { href: "/guide", label: "Guide", icon: EarthIcon },
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
