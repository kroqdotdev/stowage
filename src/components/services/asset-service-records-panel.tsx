"use client";

import { ServiceHistory } from "@/components/services/service-history";
import type { Id } from "@/lib/convex-api";

export function AssetServiceRecordsPanel({
  assetId,
}: {
  assetId: string;
}) {
  return <ServiceHistory assetId={assetId as Id<"assets">} />;
}
