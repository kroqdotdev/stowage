"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Monitor, Printer } from "lucide-react";
import { toast } from "sonner";
import type { FieldDefinition } from "@/components/fields/types";
import { LabelPreview } from "@/components/labels/label-preview";
import { TemplateDesigner } from "@/components/labels/template-designer";
import type {
  LabelPreviewAsset,
  LabelTemplate,
} from "@/components/labels/types";
import { Button } from "@/components/ui/button";
import { SheetHeading } from "@/components/ui/sheet-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getLabelPreviewAsset } from "@/lib/api/assets";
import { listCustomFields } from "@/lib/api/custom-fields";
import {
  ensureDefaultLabelTemplates,
  getLabelUrlBase,
  listLabelTemplates,
} from "@/lib/api/label-templates";

export function LabelsPageClient() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const templatesQuery = useQuery({
    queryKey: ["label-templates"],
    queryFn: listLabelTemplates,
  });
  const labelUrlBaseQuery = useQuery({
    queryKey: ["label-templates", "url-base"],
    queryFn: getLabelUrlBase,
  });
  const sampleAssetQuery = useQuery({
    queryKey: ["assets", "label-preview"],
    queryFn: getLabelPreviewAsset,
  });
  const fieldDefinitionsQuery = useQuery({
    queryKey: ["custom-fields", "list"],
    queryFn: listCustomFields,
  });

  const ensureMutation = useMutation({
    mutationFn: ensureDefaultLabelTemplates,
    onSuccess: (result) => {
      if (result.seeded) {
        toast.success("Default label templates created");
        void queryClient.invalidateQueries({ queryKey: ["label-templates"] });
      }
    },
  });
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) {
      return;
    }

    if (templatesQuery.isPending || !templatesQuery.data || !currentUser) {
      return;
    }

    if (currentUser.role !== "admin" || templatesQuery.data.length > 0) {
      return;
    }

    seededRef.current = true;
    ensureMutation.mutate(undefined, {
      onError: () => {
        seededRef.current = false;
      },
    });
  }, [
    currentUser,
    ensureMutation,
    templatesQuery.data,
    templatesQuery.isPending,
  ]);

  if (
    templatesQuery.isPending ||
    labelUrlBaseQuery.isPending ||
    sampleAssetQuery.isPending ||
    fieldDefinitionsQuery.isPending
  ) {
    return (
      <div className="space-y-6">
        <span className="sr-only">Loading label designer...</span>
        <Skeleton className="h-10 w-80 rounded-md" aria-hidden="true" />
        <Skeleton className="h-72 rounded-md" aria-hidden="true" />
      </div>
    );
  }

  const templates = (templatesQuery.data ?? []) as LabelTemplate[];
  const labelUrlBase = labelUrlBaseQuery.data ?? null;
  const sampleAsset = (sampleAssetQuery.data ??
    null) as LabelPreviewAsset | null;
  const fieldDefinitions = (fieldDefinitionsQuery.data ??
    []) as FieldDefinition[];

  if (!isDesktop) {
    return (
      <MobileLabelList
        currentUserRole={currentUser?.role ?? null}
        templates={templates}
        sampleAsset={sampleAsset}
        fieldDefinitions={fieldDefinitions}
        labelUrlBase={labelUrlBase}
      />
    );
  }

  return (
    <TemplateDesigner
      currentUserRole={currentUser?.role ?? null}
      templates={templates}
      labelUrlBase={labelUrlBase}
      sampleAsset={sampleAsset}
      fieldDefinitions={fieldDefinitions}
    />
  );
}

function MobileLabelList({
  currentUserRole,
  templates,
  sampleAsset,
  fieldDefinitions,
  labelUrlBase,
}: {
  currentUserRole: "admin" | "user" | null;
  templates: LabelTemplate[];
  sampleAsset: LabelPreviewAsset | null;
  fieldDefinitions: FieldDefinition[];
  labelUrlBase: string | null;
}) {
  return (
    <div className="space-y-6" data-testid="labels-mobile-view">
      <div
        className="flex items-start gap-3 text-sm"
        data-testid="labels-desktop-banner"
      >
        <Monitor
          className="mt-0.5 size-5 shrink-0 text-ink-2"
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold text-foreground">
            {currentUserRole === "admin"
              ? "Open Stowage on desktop to edit"
              : "Label previews are read-only"}
          </p>
          <p className="mt-0.5 text-ink-2">
            {currentUserRole === "admin"
              ? "The label designer is a drag-and-drop canvas and really only works with a mouse. You can still preview templates and print labels from a phone."
              : "You can preview templates and print labels from a phone. Ask an admin to change label templates."}
          </p>
        </div>
      </div>

      <Button asChild className="h-11 w-full md:hidden">
        <Link href="/labels/print">
          <Printer />
          Print labels…
        </Link>
      </Button>

      <section aria-labelledby="labels-mobile-templates">
        <SheetHeading
          title={<span id="labels-mobile-templates">Templates</span>}
          count={templates.length}
        />
        {templates.length === 0 ? (
          <p className="py-4 text-sm text-ink-2">No templates yet.</p>
        ) : (
          <ul data-testid="labels-mobile-template-list">
            {templates.map((template) => (
              <li
                key={template.id}
                className="border-b border-border py-4"
                data-testid={`labels-mobile-template-${template.id}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                    {template.name}
                    {template.isDefault ? (
                      <span className="ml-2 font-normal text-muted-foreground">
                        Default
                      </span>
                    ) : null}
                  </p>
                  <p className="shrink-0 font-mono text-[13px] font-medium text-ink-2">
                    {template.widthMm} × {template.heightMm} mm
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-center overflow-hidden rounded-md bg-secondary p-4">
                  <LabelPreview
                    template={template}
                    asset={sampleAsset}
                    fieldDefinitions={fieldDefinitions}
                    origin={labelUrlBase ?? undefined}
                    scale={0.7}
                    surfaceClassName="border-line-2 shadow-none"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
