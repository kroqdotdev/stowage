"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import type { Id } from "@/lib/convex-api";
import { api } from "@/lib/convex-api";
import type { ServiceGroupAsset } from "@/components/services/types";
import { StatusBadge } from "@/components/assets/status-badge";

export function ServiceGroupAssetsPanel({
  groupId,
}: {
  groupId: Id<"serviceGroups">;
}) {
  const rows = useQuery(api.serviceGroups.listGroupAssets, { groupId });
  const assets = useMemo(() => (rows ?? []) as ServiceGroupAsset[], [rows]);

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

      <div className="mt-4 overflow-x-auto rounded-lg border border-border/60">
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
            {rows === undefined ? (
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
                <tr key={asset._id} className="border-t border-border/50">
                  <td className="px-3 py-2 font-medium">{asset.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {asset.assetTag}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={asset.status} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/assets/${asset._id}`}
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
