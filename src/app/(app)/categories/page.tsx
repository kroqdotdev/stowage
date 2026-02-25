import { CategoriesPageClient } from "@/components/categories/categories-page-client";
import { PageHeader } from "@/components/layout/page-header";

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Organize assets into categories."
      />
      <CategoriesPageClient />
    </div>
  );
}
