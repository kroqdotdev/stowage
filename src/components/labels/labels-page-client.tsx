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
      <div className="rounded-2xl border border-border/70 bg-background p-6 text-sm text-muted-foreground shadow-sm">
        Loading label designer...
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
    <div className="flex flex-col gap-4" data-testid="labels-mobile-view">
      <div
        className="flex items-start gap-3 rounded-xl border border-amber-300/70 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200"
        data-testid="labels-desktop-banner"
      >
        <Monitor className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-medium">
            {currentUserRole === "admin"
              ? "Open Stowage on desktop to edit"
              : "Label previews are read-only"}
          </p>
          <p>
            {currentUserRole === "admin"
              ? "The label designer is a drag-and-drop canvas and really only works with a mouse. You can still preview templates and print labels from a phone."
              : "You can preview templates and print labels from a phone. Ask an admin to change label templates."}
          </p>
        </div>
      </div>

      <Button asChild className="w-full cursor-pointer">
        <Link href="/labels/print">
          <Printer className="h-4 w-4" />
          Print labels
        </Link>
      </Button>

      {templates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
          No templates yet.
        </p>
      ) : (
        <ul
          className="flex flex-col gap-3"
          data-testid="labels-mobile-template-list"
        >
          {templates.map((template) => (
            <li
              key={template.id}
              className="rounded-xl border border-border/70 bg-background p-4 shadow-sm"
              data-testid={`labels-mobile-template-${template.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-semibold">
                    {template.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {template.widthMm} × {template.heightMm} mm
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-center overflow-hidden rounded-md bg-white p-2">
                <LabelPreview
                  template={template}
                  asset={sampleAsset}
                  fieldDefinitions={fieldDefinitions}
                  origin={labelUrlBase ?? undefined}
                  scale={0.7}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
