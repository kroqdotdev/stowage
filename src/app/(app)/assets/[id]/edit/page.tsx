import { AssetEditPageClient } from "@/components/assets/asset-edit-page-client";
import { PageHeader } from "@/components/layout/page-header";

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <PageHeader
        title="Edit asset"
        breadcrumbs={[
          { label: "Asset", href: `/assets/${id}` },
          { label: "Edit asset" },
        ]}
      />
      <AssetEditPageClient assetId={id} />
    </div>
  );
}
