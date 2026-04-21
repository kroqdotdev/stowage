"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";

type LocationItem = {
  id: string;
  name: string;
  count: number;
};

export function LocationBreakdown({ items }: { items: LocationItem[] }) {
  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <h2 className="shrink-0 text-base font-semibold tracking-tight">
        By Location
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No locations with assets yet.
        </p>
      ) : (
        <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/assets?location=${item.id}`}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{item.name}</span>
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">
                {item.count}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
