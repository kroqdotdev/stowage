"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  MapPin,
  Layers,
  Wrench,
  Printer,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const inventoryItems: NavItem[] = [
  { title: "Assets", href: "/assets", icon: Package },
  { title: "Locations", href: "/locations", icon: MapPin },
];

const organizeItems: NavItem[] = [
  { title: "Taxonomy", href: "/taxonomy", icon: Layers },
];

const maintainItems: NavItem[] = [
  { title: "Services", href: "/services", icon: Wrench },
  { title: "Labels", href: "/labels", icon: Printer },
];

const dashboardItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

function isItemActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/taxonomy") {
    return (
      pathname.startsWith("/taxonomy") ||
      pathname.startsWith("/categories") ||
      pathname.startsWith("/tags") ||
      pathname.startsWith("/fields")
    );
  }
  return pathname.startsWith(href);
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label?: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <SidebarGroup>
      {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isItemActive(pathname, item.href)}
                tooltip={item.title}
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold text-foreground"
        >
          <Package className="h-5 w-5 shrink-0" />
          <span className="truncate group-data-[collapsible=icon]:hidden">
            Stowage
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup items={dashboardItems} pathname={pathname} />
        <NavGroup label="Inventory" items={inventoryItems} pathname={pathname} />
        <NavGroup label="Organize" items={organizeItems} pathname={pathname} />
        <NavGroup label="Maintain" items={maintainItems} pathname={pathname} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isItemActive(pathname, "/settings")}
              tooltip="Settings"
            >
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
