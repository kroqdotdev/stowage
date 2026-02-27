import { AssetsPageClient } from "@/components/assets/assets-page-client"
import { PageHeader } from "@/components/layout/page-header"

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description="Track, filter, and manage your inventory."
      />
      <AssetsPageClient />
    </div>
  )
}
