# Sidebar (shadcn, base-nova)

Pasted by Dhruv on 2026-08-30, condensed. Install: `npx shadcn@latest add sidebar`. Blocks: browse /blocks (sidebar-07 is the icon collapsible one).

Composition: `SidebarProvider` > `Sidebar` (`SidebarHeader`, `SidebarContent` > `SidebarGroup` > `SidebarGroupLabel`, `SidebarGroupAction`, `SidebarGroupContent`, `SidebarMenu` > `SidebarMenuItem` > `SidebarMenuButton`, `SidebarMenuAction`, `SidebarMenuBadge`, `SidebarMenuSub` > `SidebarMenuSubItem`), `SidebarFooter`, `SidebarRail`) + `SidebarInset` + `SidebarTrigger`.

- `SidebarProvider` props: `defaultOpen`, `open`, `onOpenChange`. Widths via `SIDEBAR_WIDTH = "16rem"`, `SIDEBAR_WIDTH_MOBILE = "18rem"` or `--sidebar-width` style vars. Keyboard shortcut `cmd+b` / `ctrl+b` (`SIDEBAR_KEYBOARD_SHORTCUT = "b"`).
- `Sidebar` props: `side` left|right, `variant` sidebar|floating|inset (inset needs `SidebarInset` around main), `collapsible` offcanvas|icon|none.
- `useSidebar()` returns `state` (expanded|collapsed), `open`, `setOpen`, `openMobile`, `setOpenMobile`, `isMobile`, `toggleSidebar`.
- `SidebarMenuButton` renders a button, use `render={<Link href="/x" />}` for links, `isActive` for the active item. Tooltips appear when collapsed to icons.
- Header: workspace switcher via `DropdownMenuTrigger render={<SidebarMenuButton />}`. Footer: user card `SidebarMenuButton` with avatar and a dropdown.
- Collapsible group: wrap `SidebarGroup` in `Collapsible`, label as `CollapsibleTrigger`, chevron rotates with `group-data-open/collapsible:rotate-180`.
- `SidebarRail` is the drag handle that also toggles. `SidebarMenuSkeleton` for loading. `SidebarMenuBadge` for counts.
- Styling by state: `group-data-[collapsible=icon]:hidden`, `peer-data-[active=true]/menu-button:opacity-100`.
- Theme vars: `--sidebar-background`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring` on `:root` and `.dark`. Set the ring to white or black for Voidwatch, not blue.
