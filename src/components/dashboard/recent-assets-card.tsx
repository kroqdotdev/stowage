"use client";

import Link from "next/link";
import type { AppDateFormat } from "@/lib/date-format";
import { StatusText } from "@/components/ui/status-text";
import { SheetFoot, SheetHeading } from "@/components/ui/sheet-heading";
import { TagChip } from "@/components/ui/tag-chip";
import type { AssetStatus } from "@/components/assets/types";
import { formatRelativeTime } from "@/lib/relative-time";

type RecentAssetItem = {
  id: string;
  name: string;
  assetTag: string;
  status: AssetStatus;
  updatedAt: number;
};

/*
  Recently updated: the shared chip column, the asset name with its status
  when it is an exception, and the time at the right (long form on desktop,
  short form below).
*/
export function RecentAssetsCard({
  items,
}: {
  items: RecentAssetItem[];
  dateFormat?: AppDateFormat;
}) {
  const visible = items.slice(0, 5);

  return (
    <section aria-labelledby="recent-heading">
      <SheetHeading title={<span id="recent-heading">Recently updated</span>} />
      {visible.length === 0 ? (
        <p className="py-6 text-sm text-ink-2">No assets have been added yet.</p>
      ) : (
        <>
          <ul>
            {visible.map((asset) => {
              const time = formatRelativeTime(asset.updatedAt);
              return (
                <li key={asset.id} className="border-b border-border">
                  <Link
                    href={`/assets/${asset.id}`}
                    className="grid min-h-12 grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-x-4 px-0.5 py-[9px] text-sm hover:bg-card/60"
                  >
                    <TagChip weight="table" className="justify-self-start">
                      {asset.assetTag}
                    </TagChip>
                    <span className="flex min-w-0 items-center gap-3">
                      <b className="truncate font-semibold text-foreground">
                        {asset.name}
                      </b>
                      <StatusText
                        status={asset.status}
                        hideActive
                        className="text-[13px]"
                        data-testid="status-badge"
                      />
                    </span>
                    <span className="text-right text-[13px] whitespace-nowrap text-ink-2">
                      <span className="hidden lg:inline">{time.long}</span>
                      <span className="lg:hidden">{time.short}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <SheetFoot>
            {items.length > visible.length ? (
              <span>
                {visible.length} of the last {items.length} changes ·{" "}
              </span>
            ) : null}
            <Link href="/assets">Open in Assets</Link>
          </SheetFoot>
        </>
      )}
    </section>
  );
}
