import { AssetDetailPageClient } from "@/components/assets/asset-detail-page-client";
import { PageHeader } from "@/components/layout/page-header";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset detail"
        description="View asset information and lifecycle data."
        breadcrumbs={[
          { label: "Stowage", href: "/dashboard" },
          { label: "Assets", href: "/assets" },
          { label: "Asset detail" },
        ]}
      />
      <AssetDetailPageClient assetId={id} />
    </div>
  );
}
