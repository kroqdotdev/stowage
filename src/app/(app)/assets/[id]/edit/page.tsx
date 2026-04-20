import { AssetEditPageClient } from "@/components/assets/asset-edit-page-client";
import { PageHeader } from "@/components/layout/page-header";

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit asset"
        description="Update this asset record."
        breadcrumbs={[
          { label: "Stowage", href: "/dashboard" },
          { label: "Assets", href: "/assets" },
          { label: "Edit asset" },
        ]}
      />
      <AssetEditPageClient assetId={id} />
    </div>
  );
}
