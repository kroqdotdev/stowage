import {
  Layers,
  LayoutGrid,
  MapPin,
  Package,
  Printer,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  key: string;
  title: string;
  /** Short label for the 88px tablet rail. */
  short?: string;
  href: string;
  icon: LucideIcon;
  badge?: "overdue";
};

export type NavGroup = { label?: string; items: NavItem[] };

/*
  Nav: Home, Services; Inventory (Assets, Locations, Taxonomy, Labels).
  Named identically on desktop, tablet and phone.
*/
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { key: "home", title: "Home", href: "/dashboard", icon: LayoutGrid },
      {
        key: "services",
        title: "Services",
        href: "/services",
        icon: Wrench,
        badge: "overdue",
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      { key: "assets", title: "Assets", href: "/assets", icon: Package },
      { key: "locations", title: "Locations", href: "/locations", icon: MapPin },
      { key: "taxonomy", title: "Taxonomy", href: "/taxonomy", icon: Layers },
      { key: "labels", title: "Labels", href: "/labels", icon: Printer },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  key: "settings",
  title: "Settings",
  href: "/settings",
  icon: Settings,
};

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/taxonomy") {
    return (
      pathname.startsWith("/taxonomy") ||
      pathname.startsWith("/categories") ||
      pathname.startsWith("/tags") ||
      pathname.startsWith("/fields")
    );
  }
  if (href === "/labels") {
    return pathname === "/labels" || pathname.startsWith("/labels/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}
