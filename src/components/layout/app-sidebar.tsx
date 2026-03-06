"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  MapPin,
  FolderOpen,
  Tags,
  SlidersHorizontal,
  Wrench,
  Printer,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const mainItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Assets", href: "/assets", icon: Package },
];

const organizationItems: NavItem[] = [
  { title: "Locations", href: "/locations", icon: MapPin },
  { title: "Categories", href: "/categories", icon: FolderOpen },
  { title: "Tags", href: "/tags", icon: Tags },
  { title: "Fields", href: "/fields", icon: SlidersHorizontal },
];

const operationsItems: NavItem[] = [
  { title: "Services", href: "/services", icon: Wrench },
  { title: "Labels", href: "/labels", icon: Printer },
];

const settingsItems: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings },
];

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
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border px-4 py-3">
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
        <NavGroup items={mainItems} pathname={pathname} />
        <NavGroup
          label="Organization"
          items={organizationItems}
          pathname={pathname}
        />
        <NavGroup
          label="Operations"
          items={operationsItems}
          pathname={pathname}
        />
        <NavGroup items={settingsItems} pathname={pathname} />
      </SidebarContent>
    </Sidebar>
  );
}
