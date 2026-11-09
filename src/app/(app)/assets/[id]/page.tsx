import { AssetDetailPageClient } from "@/components/assets/asset-detail-page-client";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AssetDetailPageClient assetId={id} />;
}
