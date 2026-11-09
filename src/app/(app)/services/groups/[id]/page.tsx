import { ServiceGroupDetailPageClient } from "@/components/services/service-group-detail-page-client";

export default async function ServiceGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ServiceGroupDetailPageClient groupId={id} />;
}
