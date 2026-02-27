import { AssetCreatePageClient } from "@/components/assets/asset-create-page-client"
import { PageHeader } from "@/components/layout/page-header"

export default function NewAssetPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New asset"
        description="Create a new asset record."
        breadcrumbs={[
          { label: "Stowage", href: "/dashboard" },
          { label: "Assets", href: "/assets" },
          { label: "New asset" },
        ]}
      />
      <AssetCreatePageClient />
    </div>
  )
}
