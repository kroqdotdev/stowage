"use client";

import Link from "next/link";
import { Plus, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild>
        <Link href="/assets/new">
          <Plus className="h-4 w-4" />
          New Asset
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/assets">
          <List className="h-4 w-4" />
          View All Assets
        </Link>
      </Button>
    </div>
  );
}
