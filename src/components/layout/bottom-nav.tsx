"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Layers,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  Monitor,
  Moon,
  Package,
  Printer,
  ScanLine,
  Settings,
  Sun,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileActionSheet } from "@/components/layout/mobile-action-sheet";
import { useLogout } from "@/components/layout/user-menu";
import { useOverdueCount } from "@/hooks/use-overdue-count";

type Slot = {
  key: "home" | "assets" | "services" | "more";
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SLOTS: Slot[] = [
  { key: "home", label: "Home", href: "/dashboard", icon: LayoutGrid },
  { key: "assets", label: "Assets", href: "/assets", icon: Package },
  { key: "services", label: "Services", href: "/services", icon: Wrench },
  { key: "more", label: "More", icon: Menu },
];

const MORE_PATH_PREFIXES = ["/locations", "/taxonomy", "/labels", "/settings"];

function isSlotActive(pathname: string, slot: Slot, moreOpen: boolean) {
  if (slot.key === "more") {
    if (moreOpen) return true;
    return MORE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  }
  if (slot.key === "home") return pathname === "/dashboard";
  if (!slot.href) return false;
  return pathname.startsWith(slot.href);
}

/*
  Phone bottom bar: Home, Assets, Scan, Services (with the overdue badge),
  More. The raised Scan slab is the only amber on the phone; the current tab is
  white.
*/
export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const scanActive = pathname.startsWith("/scan");
  const overdue = useOverdueCount();

  return (
    <>
      <nav
        aria-label="Primary"
        data-testid="bottom-nav"
        className="on-charcoal fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="relative mx-auto grid h-16 max-w-xl grid-cols-5">
          {SLOTS.slice(0, 2).map((slot) => (
            <NavItem
              key={slot.key}
              slot={slot}
              active={isSlotActive(pathname, slot, moreOpen)}
              onMoreClick={() => setMoreOpen(true)}
            />
          ))}
          <ScanSlot active={scanActive} />
          {SLOTS.slice(2).map((slot) => (
            <NavItem
              key={slot.key}
              slot={slot}
              active={isSlotActive(pathname, slot, moreOpen)}
              onMoreClick={() => setMoreOpen(true)}
              badge={slot.key === "services" ? overdue : 0}
            />
          ))}
        </div>
      </nav>
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}

function NavItem({
  slot,
  active,
  onMoreClick,
  badge = 0,
}: {
  slot: Slot;
  active: boolean;
  onMoreClick: () => void;
  badge?: number;
}) {
  const Icon = slot.icon;
  const content = (
    <>
      <Icon className="size-[22px]" aria-hidden="true" />
      <span className="text-[13px] font-semibold">{slot.label}</span>
      {badge > 0 ? (
        <span className="absolute top-1 right-[calc(50%-24px)] grid h-[18px] min-w-[18px] place-items-center rounded-md bg-destructive px-[5px] font-mono text-xs font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </>
  );
  const className = cn(
    "relative flex flex-col items-center justify-center gap-1 text-sidebar-muted transition-colors hover:text-white",
    active && "text-white",
  );

  if (slot.key === "more") {
    return (
      <button
        type="button"
        data-testid={`bottom-nav-${slot.key}`}
        aria-current={active ? "page" : undefined}
        aria-label={slot.label}
        className={cn(className, "cursor-pointer")}
        onClick={onMoreClick}
      >
        {content}
      </button>
    );
  }

  if (!slot.href) return null;

  return (
    <Link
      href={slot.href}
      data-testid={`bottom-nav-${slot.key}`}
      aria-current={active ? "page" : undefined}
      aria-label={slot.label}
      className={className}
    >
      {content}
    </Link>
  );
}

function ScanSlot({ active }: { active: boolean }) {
  return (
    <Link
      href="/scan"
      data-testid="bottom-nav-scan"
      aria-label="Scan a label"
      aria-current={active ? "page" : undefined}
      onClick={() => {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate?.(10);
        }
      }}
      className="flex flex-col items-center justify-center gap-1 text-[13px] font-semibold text-sidebar-foreground"
    >
      <span
        className={cn(
          "-mt-[30px] grid h-12 w-[60px] place-items-center rounded-md border-4 border-sidebar bg-[var(--scan)] text-[var(--scan-foreground)] shadow-[3px_3px_0_var(--color-sidebar-accent)] transition-transform active:scale-95",
          active && "outline-2 outline-offset-2 outline-white",
        )}
      >
        <ScanLine className="size-[26px]" aria-hidden="true" />
      </span>
      Scan
    </Link>
  );
}

function MoreSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { setTheme, theme } = useTheme();
  const { loggingOut, handleLogout } = useLogout();

  const items: { label: string; href: string; icon: typeof MapPin }[] = [
    { label: "Locations", href: "/locations", icon: MapPin },
    { label: "Taxonomy", href: "/taxonomy", icon: Layers },
    { label: "Labels", href: "/labels", icon: Printer },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <MobileActionSheet
      open={open}
      onOpenChange={onOpenChange}
      title="More"
      description="Additional pages and account actions"
      hideHeader
      aria-label="More menu"
    >
      <ul className="grid grid-cols-2 gap-2" data-testid="more-sheet-grid">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              data-testid={`more-item-${item.href.replace("/", "")}`}
              onClick={() => onOpenChange(false)}
              className="flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-md border border-border bg-card text-sm font-semibold text-foreground hover:bg-secondary"
            >
              <item.icon className="size-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-2">
        <div className="eyebrow mb-1.5">Appearance</div>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={theme === option.value}
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-card text-sm font-medium",
                theme === option.value && "border-foreground font-semibold",
              )}
            >
              <option.icon className="size-4" aria-hidden="true" />
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        data-testid="more-sheet-signout"
        disabled={loggingOut}
        onClick={(event) => {
          event.preventDefault();
          void handleLogout();
        }}
        className="mt-2 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border-[1.5px] border-foreground bg-card text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
      >
        <LogOut className="size-4" aria-hidden="true" />
        {loggingOut ? "Signing out…" : "Sign out"}
      </button>
    </MobileActionSheet>
  );
}
