"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/services", label: "List" },
  { href: "/services/calendar", label: "Calendar" },
  { href: "/services/groups", label: "Groups" },
];

export function ServicesNavTabs() {
  const pathname = usePathname() ?? "";

  return (
    <div className="inline-flex rounded-lg border border-border/70 bg-muted/20 p-1">
      {tabs.map((tab) => {
        const active =
          tab.href === "/services"
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
