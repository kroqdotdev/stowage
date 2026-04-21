"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ServiceGroupAsset } from "@/components/services/types";
import { StatusBadge } from "@/components/assets/status-badge";
import { listServiceGroupAssets } from "@/lib/api/service-groups";

export function ServiceGroupAssetsPanel({ groupId }: { groupId: string }) {
  const rowsQuery = useQuery({
    queryKey: ["service-groups", groupId, "assets"],
    queryFn: () => listServiceGroupAssets(groupId),
  });
  const assets = useMemo(
    () => (rowsQuery.data ?? []) as ServiceGroupAsset[],
    [rowsQuery.data],
  );

  return (
    <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">
          Assigned assets
        </h3>
        <p className="text-xs text-muted-foreground">
          Assets assigned to this service group are maintained from asset
          create/edit.
        </p>
      </div>

      {rowsQuery.isPending ? (
        <p className="mt-4 text-sm text-muted-foreground md:hidden">
          Loading assets...
        </p>
      ) : assets.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground md:hidden">
          No assets are currently assigned to this group.
        </p>
      ) : (
        <ul
          className="mt-4 flex flex-col gap-2 md:hidden"
          data-testid="service-group-assets-card-list"
        >
          {assets.map((asset) => (
            <li
              key={asset.id}
              data-testid={`service-group-asset-card-${asset.id}`}
              className="rounded-lg border border-border/70 bg-card p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/assets/${asset.id}`}
                    className="block truncate text-sm font-semibold hover:text-primary"
                  >
                    {asset.name}
                  </Link>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                    {asset.assetTag}
                  </p>
                </div>
                <StatusBadge status={asset.status} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 hidden overflow-x-auto rounded-lg border border-border/60 md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Asset</th>
              <th className="px-3 py-2 font-medium">Tag</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">Open</th>
            </tr>
          </thead>
          <tbody>
            {rowsQuery.isPending ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Loading assets...
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No assets are currently assigned to this group.
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr key={asset.id} className="border-t border-border/50">
                  <td className="px-3 py-2 font-medium">{asset.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {asset.assetTag}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={asset.status} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/assets/${asset.id}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      Open asset
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
