"use client";

import { ServiceHistory } from "@/components/services/service-history";

export function AssetServiceRecordsPanel({
  assetId,
}: {
  assetId: string;
}) {
  return <ServiceHistory assetId={assetId} />;
}
