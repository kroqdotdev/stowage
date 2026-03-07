"use client";

import Link from "next/link";

type CategoryItem = {
  _id: string;
  name: string;
  color: string;
  count: number;
};

export function CategoryBreakdown({ items }: { items: CategoryItem[] }) {
  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <h2 className="shrink-0 text-base font-semibold tracking-tight">
        By Category
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No categories with assets yet.
        </p>
      ) : (
        <div className="mt-3 min-h-0 flex-1 space-y-2.5 overflow-y-auto">
          {items.map((item) => (
            <Link
              key={item._id}
              href={`/assets?category=${item._id}`}
              className="group block"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium group-hover:text-primary transition-colors">
                    {item.name}
                  </span>
                </div>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {item.count}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(item.count / maxCount) * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
