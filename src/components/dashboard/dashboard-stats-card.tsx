"use client";

import { Package, FolderTree, Grid3X3 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { Badge } from "@/components/ui/badge";

export function DashboardStatsCard() {
  const stats = useQuery(api.assets.getDashboardStats, {});

  if (stats === undefined) {
    return (
      <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <h2 className="text-base font-semibold tracking-tight">Overview</h2>
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
      <h2 className="text-base font-semibold tracking-tight">Overview</h2>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/40">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-semibold leading-tight">
              {stats.totalAssets}
            </p>
            <p className="text-xs text-muted-foreground">Assets</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/40">
            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-semibold leading-tight">
              {stats.totalCategories}
            </p>
            <p className="text-xs text-muted-foreground">Categories</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/40">
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-semibold leading-tight">
              {stats.totalLocations}
            </p>
            <p className="text-xs text-muted-foreground">Locations</p>
          </div>
        </div>
      </div>

      {stats.statusBreakdown.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground">
            By status
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {stats.statusBreakdown.map((entry) => (
              <Badge key={entry.status} className="bg-muted/20 capitalize">
                {entry.status} ({entry.count})
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
