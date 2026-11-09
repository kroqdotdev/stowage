"use client";

import Link from "next/link";
import { SheetHeading } from "@/components/ui/sheet-heading";

type CategoryItem = {
  id: string;
  name: string;
  color: string;
  count: number;
};

/*
  Assets by category: one ink bar on a faint track (capped at 320px, kept
  short of full so every row shows its track) with the count right after it.
  Categories carry no colour; length does the work.
*/
export function CategoryBreakdown({ items }: { items: CategoryItem[] }) {
  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <section aria-labelledby="category-heading">
      <SheetHeading
        title={<span id="category-heading">Assets by category</span>}
        aside={<Link href="/taxonomy">Open Taxonomy</Link>}
      />
      {items.length === 0 ? (
        <p className="py-6 text-sm text-ink-2">No categories with assets yet.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id} className="border-b border-border">
              <Link
                href={`/assets?category=${item.id}`}
                className="grid grid-cols-[minmax(0,1fr)_minmax(64px,200px)_32px] lg:grid-cols-[minmax(0,1fr)_minmax(64px,180px)_32px] items-center gap-3 px-0.5 py-[9px] text-sm hover:bg-card/60"
              >
                <span className="truncate text-foreground">{item.name}</span>
                <span className="relative block h-1.5 bg-border" aria-hidden="true">
                  <i
                    className="absolute inset-y-0 left-0 bg-foreground"
                    style={{ width: `${(item.count / maxCount) * 96}%` }}
                  />
                </span>
                <b className="text-right font-mono font-medium tabular-nums">
                  {item.count}
                </b>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
