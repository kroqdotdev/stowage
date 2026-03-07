"use client";

import { ServiceHistory } from "@/components/services/service-history";
import type { Id } from "@/lib/convex-api";

export function AssetServiceRecordsPanel({
  assetId,
}: {
  assetId: Id<"assets">;
}) {
  return <ServiceHistory assetId={assetId} />;
}
