"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanLine } from "lucide-react";
import { StowageMark } from "@/components/brand/stowage-mark";
import { GlobalSearch } from "@/components/search/global-search";
import { UserMenu } from "@/components/layout/user-menu";
import {
  NAV_GROUPS,
  SETTINGS_ITEM,
  isNavItemActive,
  type NavItem,
} from "@/components/layout/nav-config";
import { useOverdueCount } from "@/hooks/use-overdue-count";
import { cn } from "@/lib/utils";

function OverdueBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} overdue`}
      className={cn(
        "grid h-5 min-w-5 place-items-center rounded-md bg-destructive px-1.5 font-mono text-[13px] font-semibold text-white",
        className,
      )}
    >
      {count}
    </span>
  );
}

function SidebarItem({
  item,
  active,
  overdue,
}: {
  item: NavItem;
  active: boolean;
  overdue: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-[38px] items-center gap-[11px] rounded-md px-3 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-white",
        active &&
          "bg-sidebar-accent text-white before:absolute before:top-2 before:bottom-2 before:left-0 before:w-[3px] before:rounded-xs before:bg-sidebar-primary",
      )}
    >
      <Icon
        className={cn(
          "size-[17px]",
          active ? "text-sidebar-primary" : "text-sidebar-muted",
        )}
        aria-hidden="true"
      />
      {item.title}
      {item.badge === "overdue" ? (
        <OverdueBadge count={overdue} className="ml-auto" />
      ) : null}
    </Link>
  );
}

/*
  Desktop (1024px and up): a 252px charcoal sidebar. Search and "Scan a label"
  sit at the top; the current item carries the amber mark.
*/
export function AppSidebar() {
  const pathname = usePathname();
  const overdue = useOverdueCount();

  return (
    <aside
      aria-label="Main"
      className="on-charcoal sticky top-0 hidden h-dvh w-[252px] shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex"
    >
      <Link
        href="/dashboard"
        className="wide flex items-center gap-2.5 px-[18px] pt-[18px] pb-3.5 text-base font-bold text-white"
      >
        <StowageMark size={24} color="#fff" />
        Stowage
      </Link>
      <div className="space-y-1.5 px-3 pb-2">
        <GlobalSearch variant="sidebar" />
        <Link
          href="/scan"
          className="flex h-9 items-center justify-center gap-2 rounded-md border-[1.5px] border-sidebar-muted text-sm font-semibold text-white hover:bg-sidebar-accent"
        >
          <ScanLine className="size-4" aria-hidden="true" />
          Scan a label
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {NAV_GROUPS.map((group, index) => (
          <div key={index} className="px-3 pt-2">
            {group.label ? (
              <h4 className="eyebrow mt-2.5 mb-1 ml-3 text-sidebar-muted">
                {group.label}
              </h4>
            ) : null}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarItem
                  key={item.key}
                  item={item}
                  active={isNavItemActive(pathname, item.href)}
                  overdue={overdue}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto space-y-1 border-t border-sidebar-border p-3">
        <SidebarItem
          item={SETTINGS_ITEM}
          active={isNavItemActive(pathname, SETTINGS_ITEM.href)}
          overdue={0}
        />
        <UserMenu />
      </div>
    </aside>
  );
}

function RailItem({
  item,
  active,
  overdue,
}: {
  item: NavItem;
  active: boolean;
  overdue: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={item.title}
      className={cn(
        "relative flex h-14 flex-col items-center justify-center gap-1 rounded-md text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-white",
        active &&
          "bg-sidebar-accent text-white before:absolute before:top-2 before:bottom-2 before:left-0 before:w-[3px] before:rounded-xs before:bg-sidebar-primary",
      )}
    >
      <Icon
        className={cn(
          "size-5",
          active ? "text-sidebar-primary" : "text-sidebar-muted",
        )}
        aria-hidden="true"
      />
      {item.short ?? item.title}
      {item.badge === "overdue" ? (
        <OverdueBadge
          count={overdue}
          className="absolute top-0 right-[calc(50%-30px)] h-[18px] min-w-[18px] text-xs"
        />
      ) : null}
    </Link>
  );
}

/*
  Tablet (768 to 1023px): an 88px labelled icon rail. Search and Scan share
  one treatment above a 2px rule, so the current item's fill stays unique.
*/
export function AppRail() {
  const pathname = usePathname();
  const overdue = useOverdueCount();

  return (
    <aside
      aria-label="Main"
      className="on-charcoal sticky top-0 hidden h-dvh w-[88px] shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex lg:hidden"
    >
      <Link
        href="/dashboard"
        aria-label="Stowage home"
        className="flex justify-center pt-[18px] pb-2.5"
      >
        <StowageMark size={24} color="#fff" />
      </Link>
      <div className="space-y-3 px-2.5 pb-4">
        <GlobalSearch variant="rail" />
        <Link
          href="/scan"
          className="flex h-12 flex-col items-center justify-center gap-1 rounded-md border border-sidebar-muted text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ScanLine className="size-[18px] text-white" aria-hidden="true" />
          Scan
        </Link>
      </div>
      <nav className="mx-2.5 flex-1 space-y-1.5 overflow-y-auto border-t-2 border-sidebar-muted pt-4">
        {NAV_GROUPS.flatMap((group) => group.items).map((item) => (
          <RailItem
            key={item.key}
            item={item}
            active={isNavItemActive(pathname, item.href)}
            overdue={overdue}
          />
        ))}
      </nav>
      <div className="flex flex-col gap-1 p-2.5">
        <RailItem
          item={SETTINGS_ITEM}
          active={isNavItemActive(pathname, SETTINGS_ITEM.href)}
          overdue={0}
        />
        <div className="flex justify-center">
          <UserMenu compact side="right" />
        </div>
      </div>
    </aside>
  );
}
