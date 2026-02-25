"use client";

import { Search, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Topbar() {
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
        <Button variant="ghost" size="icon" className="cursor-pointer" disabled>
          <User className="h-4 w-4" />
          <span className="sr-only">User menu</span>
        </Button>
      </div>
    </header>
  );
}
