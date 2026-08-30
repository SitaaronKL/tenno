import { LayoutGridIcon } from "@/components/icons/layout-grid";
import { WorkflowIcon } from "@/components/icons/workflow";
import { MessageCircleIcon } from "@/components/icons/message-circle";
import { SettingsIcon } from "@/components/icons/settings";

export type NavIcon = typeof LayoutGridIcon;

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
