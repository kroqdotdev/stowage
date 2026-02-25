import { PageHeader } from "@/components/layout/page-header";
import { TagsPageClient } from "@/components/tags/tags-page-client";

export default function TagsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Tags" description="Create and manage asset tags." />
      <TagsPageClient />
    </div>
  );
}
