"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { FieldDefinition } from "@/components/fields/types";
import { TemplateDesigner } from "@/components/labels/template-designer";
import type {
  LabelPreviewAsset,
  LabelTemplate,
} from "@/components/labels/types";
import { useCurrentUser } from "@/hooks/use-current-user";
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

    if (
      templatesQuery.isPending ||
      !templatesQuery.data ||
      !currentUser
    ) {
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
  }, [currentUser, ensureMutation, templatesQuery.data, templatesQuery.isPending]);

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
  const sampleAsset = (sampleAssetQuery.data ?? null) as LabelPreviewAsset | null;
  const fieldDefinitions = (fieldDefinitionsQuery.data ?? []) as FieldDefinition[];

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
