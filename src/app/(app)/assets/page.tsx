import { Suspense } from "react";
import { AssetsPageClient } from "@/components/assets/assets-page-client";

export default function AssetsPage() {
  return (
    <Suspense>
      <AssetsPageClient />
    </Suspense>
  );
}
