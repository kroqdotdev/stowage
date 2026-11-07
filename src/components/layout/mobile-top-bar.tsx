"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { StowageMark } from "@/components/brand/stowage-mark";
import { GlobalSearch } from "@/components/search/global-search";
import { UserMenu } from "@/components/layout/user-menu";
import { NAV_GROUPS, SETTINGS_ITEM, isNavItemActive } from "@/components/layout/nav-config";

const SLOT_ID = "mobile-top-bar-slot";

function pageTitle(pathname: string) {
  if (pathname === "/dashboard") return null;
  const items = [...NAV_GROUPS.flatMap((group) => group.items), SETTINGS_ITEM];
  return items.find((item) => isNavItemActive(pathname, item.href))?.title ?? null;
}

/*
  Phone (below 768px): a 56px charcoal top bar. Home shows the wordmark; other
  pages show their name. The + is New asset, or New location on Locations.
  A page can replace the whole bar (the asset back bar) with <MobileBar>.
*/
export function MobileTopBar() {
  const pathname = usePathname();
  const title = pageTitle(pathname);
  const onLocations = pathname.startsWith("/locations");

  return (
    <header className="on-charcoal sticky top-0 z-30 h-14 bg-sidebar text-white md:hidden">
      <div className="flex h-full items-center gap-2 pr-2 pl-4">
        <Link
          href="/dashboard"
          className="wide mr-auto flex min-w-0 items-center gap-[9px] text-base font-bold"
        >
          <StowageMark size={24} color="#fff" />
          <span className="truncate">{title ?? "Stowage"}</span>
          <span id="mobile-top-bar-count" className="font-mono text-sm font-medium tracking-normal text-sidebar-muted" />
        </Link>
        <Link
          href={onLocations ? "/locations?new=1" : "/assets/new"}
          aria-label={onLocations ? "New location" : "New asset"}
          title={onLocations ? "New location" : "New asset"}
          className="grid size-11 place-items-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Plus className="size-5" />
        </Link>
        <GlobalSearch variant="icon" />
        <UserMenu compact align="end" side="bottom" />
      </div>
      <div id={SLOT_ID} className="pointer-events-none absolute inset-0 empty:hidden" />
    </header>
  );
}

function useSlot(id: string) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setEl(document.getElementById(id));
  }, [id]);
  return el;
}

/*
  Replaces the phone top bar for the current page, for example the asset back
  bar: back, the tag, then the page's actions.
*/
export function MobileBar({
  backHref,
  backLabel = "Back",
  center,
  actions,
}: {
  backHref?: string;
  backLabel?: string;
  center?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const slot = useSlot(SLOT_ID);
  if (!slot) return null;
  return createPortal(
    <div className="pointer-events-auto flex h-full items-center gap-1 bg-sidebar px-2">
      {backHref ? (
        <Link
          href={backHref}
          aria-label={backLabel}
          className="grid size-11 place-items-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ArrowLeft className="size-5" />
        </Link>
      ) : null}
      <div className="flex min-w-0 flex-1 justify-center">{center}</div>
      <div className="flex items-center">{actions}</div>
    </div>,
    slot,
  );
}

/* Shows a page's count in mono next to its name in the phone top bar. */
export function MobileTitleCount({ count }: { count: number | string }) {
  const slot = useSlot("mobile-top-bar-count");
  if (!slot) return null;
  return createPortal(<>{count}</>, slot);
}
