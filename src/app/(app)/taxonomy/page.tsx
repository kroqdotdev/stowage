"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoriesPageClient } from "@/components/categories/categories-page-client";
import { TagsPageClient } from "@/components/tags/tags-page-client";
import { FieldsPageClient } from "@/components/fields/fields-page-client";

const VALID_TABS = ["categories", "tags", "fields"] as const;
type TabValue = (typeof VALID_TABS)[number];

function TaxonomyTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawTab = searchParams.get("tab");
  const tab: TabValue =
    rawTab && VALID_TABS.includes(rawTab as TabValue)
      ? (rawTab as TabValue)
      : "categories";

  function handleTabChange(value: string) {
    router.replace(`/taxonomy?tab=${value}`, { scroll: false });
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="tags">Tags</TabsTrigger>
        <TabsTrigger value="fields">Fields</TabsTrigger>
      </TabsList>
      <TabsContent value="categories" className="mt-6">
        <CategoriesPageClient />
      </TabsContent>
      <TabsContent value="tags" className="mt-6">
        <TagsPageClient />
      </TabsContent>
      <TabsContent value="fields" className="mt-6">
        <FieldsPageClient />
      </TabsContent>
    </Tabs>
  );
}

export default function TaxonomyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Taxonomy"
        description="Manage categories, tags, and custom fields."
        breadcrumbs={[
          { label: "Stowage", href: "/dashboard" },
          { label: "Taxonomy" },
        ]}
      />
      <Suspense>
        <TaxonomyTabs />
      </Suspense>
    </div>
  );
}
