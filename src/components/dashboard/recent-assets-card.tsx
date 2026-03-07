"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { Badge } from "@/components/ui/badge";

export function RecentAssetsCard() {
  const stats = useQuery(api.assets.getDashboardStats, {});

  if (stats === undefined) {
    return (
      <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <h2 className="text-base font-semibold tracking-tight">
          Recent assets
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-border/70 bg-background p-5 shadow-sm">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">
          Recent assets
        </h2>
        <Link
          href="/assets"
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          View all
        </Link>
      </div>

      {stats.recentAssets.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No assets have been added yet.
        </p>
      ) : (
        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {stats.recentAssets.map((asset) => (
            <article
              key={asset._id}
              className="rounded-lg border border-border/70 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{asset.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {asset.assetTag}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-muted/20 capitalize">
                    {asset.status}
                  </Badge>
                  <Link
                    href={`/assets/${asset._id}`}
                    className="text-xs text-primary underline-offset-2 hover:underline"
                  >
                    View
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
