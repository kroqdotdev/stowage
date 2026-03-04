"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { ChevronDown, Loader2, LogOut, Search, User } from "lucide-react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/convex-api";
import { clearAuthTokenCookie } from "@/lib/auth-token-cookie";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) {
    return "?";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function Topbar() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { isLoading } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const [loggingOut, setLoggingOut] = useState(false);

  const userLabel = currentUser?.name ?? "User";
  const userSecondary = currentUser?.email ?? "Signed in";

  async function handleLogout() {
    setLoggingOut(true);
    clearAuthTokenCookie();
    router.replace("/login");

    void signOut()
      .catch(() => {
        toast.error("Signed out locally. Refresh if needed.");
      })
      .finally(() => {
        setLoggingOut(false);
      });
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger className="cursor-pointer" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <div className="flex flex-1 items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search assets..."
            className="pl-9"
            disabled
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 cursor-pointer gap-2 px-2"
              disabled={isLoading || loggingOut}
              aria-label="Open user menu"
            >
              <Avatar size="sm">
                <AvatarFallback>{getInitials(userLabel)}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-32 truncate text-sm sm:inline">
                {userLabel}
              </span>
              {loggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="space-y-0.5">
              <div className="truncate font-medium">{userLabel}</div>
              <div className="truncate text-xs font-normal text-muted-foreground">
                {userSecondary}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                void handleLogout();
              }}
              className="cursor-pointer"
              disabled={loggingOut}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
