"use client";

import Link from "next/link";
import { FolderTree, Package, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickActionsCard() {
  return (
    <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
      <h2 className="text-base font-semibold tracking-tight">Quick actions</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" className="cursor-pointer">
          <Link href="/assets/new">
            <Package className="h-4 w-4" />
            Add asset
          </Link>
        </Button>
        <Button asChild variant="outline" className="cursor-pointer">
          <Link href="/locations">
            <FolderTree className="h-4 w-4" />
            Add location
          </Link>
        </Button>
        <Button asChild variant="outline" className="cursor-pointer">
          <Link href="/services">
            <Wrench className="h-4 w-4" />
            View services
          </Link>
        </Button>
      </div>
    </section>
  );
}
