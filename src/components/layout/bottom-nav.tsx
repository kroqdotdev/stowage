"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Home,
  Layers,
  LayoutGrid,
  LogOut,
  MapPin,
  MoreHorizontal,
  Package,
  Printer,
  ScanLine,
  Settings,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/api/auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MobileActionSheet } from "@/components/layout/mobile-action-sheet";

type Slot = {
  key: "home" | "assets" | "services" | "more";
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SLOTS: Slot[] = [
  { key: "home", label: "Home", href: "/dashboard", icon: Home },
  { key: "assets", label: "Assets", href: "/assets", icon: Package },
  { key: "services", label: "Services", href: "/services", icon: Wrench },
  { key: "more", label: "More", icon: MoreHorizontal },
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

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const scanActive = pathname.startsWith("/scan");

  return (
    <>
      <nav
        aria-label="Primary"
        data-testid="bottom-nav"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="relative mx-auto grid max-w-xl grid-cols-5 items-end">
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
}: {
  slot: Slot;
  active: boolean;
  onMoreClick: () => void;
}) {
  const Icon = slot.icon;
  const iconEl = <Icon className="h-5 w-5" aria-hidden="true" />;
  const labelEl = <span className="text-[10px] font-medium">{slot.label}</span>;
  const className = cn(
    "flex h-14 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-foreground",
    active && "text-primary",
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
        {iconEl}
        {labelEl}
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
      {iconEl}
      {labelEl}
    </Link>
  );
}

function ScanSlot({ active }: { active: boolean }) {
  return (
    <div className="relative -mt-5 flex items-end justify-center">
      <Link
        href="/scan"
        data-testid="bottom-nav-scan"
        aria-label="Scan an asset"
        aria-current={active ? "page" : undefined}
        onClick={() => {
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate?.(10);
          }
        }}
        className={cn(
          "flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[var(--scan)] text-[var(--scan-foreground)] shadow-lg ring-4 ring-background transition-transform active:scale-95",
          "shadow-[var(--scan)]/30",
          active && "ring-[var(--scan)]/40",
        )}
      >
        <ScanLine className="h-7 w-7" aria-hidden="true" />
      </Link>
    </div>
  );
}

function MoreSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      toast.error("Signed out locally. Refresh if needed.");
    }
    queryClient.clear();
    onOpenChange(false);
    // Note: no `finally { setLoggingOut(false) }` — the router.replace below
    // unmounts this component, and setting state on an unmounted component
    // warns in React 19.
    router.replace("/login");
  }

  const items: { label: string; href: string; icon: typeof MapPin }[] = [
    { label: "Locations", href: "/locations", icon: MapPin },
    { label: "Taxonomy", href: "/taxonomy", icon: Layers },
    { label: "Labels", href: "/labels", icon: Printer },
    { label: "Settings", href: "/settings", icon: Settings },
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
              className="flex h-20 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <LayoutGrid
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="text-sm text-muted-foreground">Appearance</span>
        </div>
        <ThemeToggle />
      </div>
      <button
        type="button"
        data-testid="more-sheet-signout"
        disabled={loggingOut}
        onClick={(event) => {
          event.preventDefault();
          void handleLogout();
        }}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium text-destructive transition-colors hover:bg-accent disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {loggingOut ? "Signing out…" : "Sign out"}
      </button>
    </MobileActionSheet>
  );
}
