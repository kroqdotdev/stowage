"use client";

import Link from "next/link";
import type { AppDateFormat } from "@/lib/date-format";
import { formatDateFromTimestamp } from "@/lib/date-format";
import { StatusBadge } from "@/components/assets/status-badge";
import type { AssetStatus } from "@/components/assets/types";

type RecentAssetItem = {
  id: string;
  name: string;
  assetTag: string;
  status: AssetStatus;
  updatedAt: number;
};

export function RecentAssetsCard({
  items,
  dateFormat,
}: {
  items: RecentAssetItem[];
  dateFormat: AppDateFormat;
}) {
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

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No assets have been added yet.
        </p>
      ) : (
        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {items.map((asset) => (
            <article
              key={asset.id}
              className="rounded-xl border border-border/70 bg-card/60 px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{asset.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {asset.assetTag}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated{" "}
                    {formatDateFromTimestamp(asset.updatedAt, dateFormat)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={asset.status} />
                  <Link
                    href={`/assets/${asset.id}`}
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
