import { Suspense } from "react";
import { AssetCreatePageClient } from "@/components/assets/asset-create-page-client";
import { PageHeader } from "@/components/layout/page-header";

export default function NewAssetPage() {
  return (
    <div>
      <PageHeader
        title="New asset"
        breadcrumbs={[{ label: "Assets", href: "/assets" }, { label: "New asset" }]}
      />
      <Suspense>
        <AssetCreatePageClient />
      </Suspense>
    </div>
  );
}
