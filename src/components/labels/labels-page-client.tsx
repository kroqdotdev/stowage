"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import type { FieldDefinition } from "@/components/fields/types";
import { TemplateDesigner } from "@/components/labels/template-designer";
import type {
  LabelPreviewAsset,
  LabelTemplate,
} from "@/components/labels/types";
import { api } from "@/lib/convex-api";

export function LabelsPageClient() {
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const templatesQuery = useQuery(api.labelTemplates.listTemplates, {});
  const labelUrlBaseQuery = useQuery(api.labelTemplates.getLabelUrlBase, {});
  const sampleAssetQuery = useQuery(api.assets.getLabelPreviewAsset, {});
  const fieldDefinitionsQuery = useQuery(
    api.customFields.listFieldDefinitions,
    {},
  );
  const ensureDefaultTemplates = useMutation(
    api.labelTemplates.ensureDefaultTemplates,
  );
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) {
      return;
    }

    if (currentUser === undefined || templatesQuery === undefined) {
      return;
    }

    if (currentUser?.role !== "admin" || templatesQuery.length > 0) {
      return;
    }

    seededRef.current = true;
    void ensureDefaultTemplates()
      .then((result) => {
        if (result.seeded) {
          toast.success("Default label templates created");
        }
      })
      .catch(() => {
        seededRef.current = false;
      });
  }, [currentUser, ensureDefaultTemplates, templatesQuery]);

  if (
    currentUser === undefined ||
    templatesQuery === undefined ||
    labelUrlBaseQuery === undefined ||
    sampleAssetQuery === undefined ||
    fieldDefinitionsQuery === undefined
  ) {
    return (
      <div className="rounded-2xl border border-border/70 bg-background p-6 text-sm text-muted-foreground shadow-sm">
        Loading label designer...
      </div>
    );
  }

  const templates = templatesQuery as LabelTemplate[];
  const labelUrlBase = (labelUrlBaseQuery ?? null) as string | null;
  const sampleAsset = (sampleAssetQuery ?? null) as LabelPreviewAsset | null;
  const fieldDefinitions = fieldDefinitionsQuery as unknown as FieldDefinition[];

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
