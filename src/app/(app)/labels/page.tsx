import Link from "next/link";
import { Printer } from "lucide-react";
import { LabelsPageClient } from "@/components/labels/labels-page-client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export default function LabelsPage() {
  return (
    <div>
      <PageHeader
        title="Labels"
        description="Templates for the labels you print and stick on assets."
        className="max-md:hidden"
        actions={
          <Button asChild variant="secondary">
            <Link href="/labels/print">
              <Printer />
              Print labels…
            </Link>
          </Button>
        }
      />
      <LabelsPageClient />
    </div>
  );
}
