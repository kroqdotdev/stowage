"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { ChevronsUpDown, Loader2, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/components/layout/nav-config";
import { useCurrentUser } from "@/hooks/use-current-user";
import { logout } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // The session is still valid on the server: stay signed in and say so.
      toast.error("Could not sign out. Please try again.");
      setLoggingOut(false);
      return;
    }
    // No setLoggingOut(false) here: the redirect unmounts the menu.
    queryClient.clear();
    router.replace("/login");
  }

  return { loggingOut, handleLogout };
}

export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-accent font-mono text-[13px] font-bold text-white",
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}

/*
  The signed-in user at the foot of the sidebar (and the avatar in the rail
  and phone top bar). The menu holds appearance and sign out.
*/
export function UserMenu({
  compact = false,
  align = "start",
  side = "top",
}: {
  compact?: boolean;
  align?: "start" | "end";
  side?: "top" | "bottom" | "right";
}) {
  const { data: currentUser, isPending } = useCurrentUser();
  const { setTheme } = useTheme();
  const { loggingOut, handleLogout } = useLogout();

  const name = currentUser?.name ?? "User";
  const role = currentUser?.role === "admin" ? "Admin" : "Member";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open user menu"
          disabled={isPending || loggingOut}
          className={cn(
            "flex cursor-pointer items-center gap-2.5 rounded-md text-left text-sidebar-foreground hover:bg-sidebar-accent disabled:opacity-60",
            compact ? "size-11 justify-center p-0" : "w-full px-2.5 py-2",
          )}
        >
          <Avatar name={name} />
          {compact ? null : (
            <>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[13px] leading-tight font-semibold text-white">
                  {name}
                </b>
                <small className="block text-[13px] text-sidebar-muted">
                  {role}
                </small>
              </span>
              {loggingOut ? (
                <Loader2 className="size-4 animate-spin text-sidebar-muted" />
              ) : (
                <ChevronsUpDown className="size-4 text-sidebar-muted" />
              )}
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-60">
        <DropdownMenuLabel className="space-y-0.5">
          <div className="truncate font-semibold">{name}</div>
          <div className="truncate text-[13px] font-normal text-muted-foreground">
            {currentUser?.email ?? "Signed in"}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="eyebrow py-1">Appearance</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
          <Sun className="size-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
          <Moon className="size-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
          <Monitor className="size-4" />
          System
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            void handleLogout();
          }}
          className="cursor-pointer"
          disabled={loggingOut}
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
