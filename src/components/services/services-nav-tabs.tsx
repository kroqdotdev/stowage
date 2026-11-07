"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/services", label: "Schedule" },
  { href: "/services/calendar", label: "Calendar" },
  { href: "/services/groups", label: "Service plans" },
  { href: "/services/providers", label: "Providers" },
];

/* The Services sections as text tabs; the current one carries the mark. */
export function ServicesNavTabs() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Services sections" className="mb-6 flex gap-0.5 overflow-x-auto border-b border-border">
      {tabs.map((tab) => {
        const active =
          tab.href === "/services"
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-[3px] border-transparent px-3 pt-2 pb-2.5 text-sm font-medium whitespace-nowrap text-ink-2 hover:text-foreground",
              active && "border-amber-ink font-semibold text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
