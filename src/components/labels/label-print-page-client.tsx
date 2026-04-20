"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";
import type { FieldDefinition } from "@/components/fields/types";
import { formatLabelDimensions } from "@/components/labels/helpers";
import { LabelPrint } from "@/components/labels/label-print";
import type {
  LabelPreviewAsset,
  LabelTemplate,
} from "@/components/labels/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getAssetsForLabels } from "@/lib/api/assets";
import { listCustomFields } from "@/lib/api/custom-fields";
import {
  ensureDefaultLabelTemplates,
  getDefaultLabelTemplate,
  getLabelUrlBase,
  listLabelTemplates,
} from "@/lib/api/label-templates";
import { useSearchParams } from "next/navigation";

function parseAssetIds(rawAssetIds: string | null, rawAssetId: string | null) {
  const values = rawAssetIds
    ? rawAssetIds.split(",").map((value) => value.trim())
    : rawAssetId
      ? [rawAssetId]
      : [];

  return Array.from(new Set(values.filter(Boolean)));
}

type BarcodeRenderState = "loading" | "ready" | "error";

function getBarcodeRenderState(
  container: HTMLElement | null,
): BarcodeRenderState {
  if (!container) {
    return "loading";
  }

  const codeNodes = Array.from(
    container.querySelectorAll<HTMLElement>("[data-barcode-type]"),
  );
  if (codeNodes.length === 0) {
    return "ready";
  }

  let hasLoading = false;
  for (const node of codeNodes) {
    const state = node.dataset.barcodeState;
    if (state === "error") {
      return "error";
    }
    if (state !== "ready") {
      hasLoading = true;
    }
  }

  return hasLoading ? "loading" : "ready";
}

export function LabelPrintPageClient() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: currentUser, isPending: currentUserPending } = useCurrentUser();

  const templatesQuery = useQuery({
    queryKey: ["label-templates"],
    queryFn: listLabelTemplates,
  });
  const defaultTemplateQuery = useQuery({
    queryKey: ["label-templates", "default"],
    queryFn: getDefaultLabelTemplate,
  });
  const labelUrlBaseQuery = useQuery({
    queryKey: ["label-templates", "url-base"],
    queryFn: getLabelUrlBase,
  });
  const fieldDefinitionsQuery = useQuery({
    queryKey: ["custom-fields", "list"],
    queryFn: listCustomFields,
  });

  const ensureMutation = useMutation({
    mutationFn: ensureDefaultLabelTemplates,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["label-templates"] });
    },
  });
  const seededRef = useRef(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const assetIds = useMemo(
    () =>
      parseAssetIds(searchParams.get("assetIds"), searchParams.get("assetId")),
    [searchParams],
  );
  const requestedTemplateId = searchParams.get("templateId");

  const assetsQuery = useQuery({
    queryKey: ["assets", "for-labels", assetIds],
    queryFn: () => getAssetsForLabels(assetIds),
    enabled: assetIds.length > 0,
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    requestedTemplateId,
  );
  const [barcodeRenderState, setBarcodeRenderState] =
    useState<BarcodeRenderState>("loading");

  useEffect(() => {
    setSelectedTemplateId(requestedTemplateId);
  }, [requestedTemplateId]);

  useEffect(() => {
    if (seededRef.current) {
      return;
    }

    if (
      currentUserPending ||
      templatesQuery.isPending ||
      !templatesQuery.data
    ) {
      return;
    }

    if (currentUser?.role !== "admin" || templatesQuery.data.length > 0) {
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
    currentUserPending,
    ensureMutation,
    templatesQuery.data,
    templatesQuery.isPending,
  ]);

  const templates = useMemo(
    () => (templatesQuery.data ?? []) as LabelTemplate[],
    [templatesQuery.data],
  );
  const defaultTemplate = useMemo(
    () => (defaultTemplateQuery.data ?? null) as LabelTemplate | null,
    [defaultTemplateQuery.data],
  );
  const fieldDefinitions = useMemo(
    () => (fieldDefinitionsQuery.data ?? []) as FieldDefinition[],
    [fieldDefinitionsQuery.data],
  );
  const labelUrlBase = useMemo(
    () => labelUrlBaseQuery.data ?? null,
    [labelUrlBaseQuery.data],
  );
  const assets = useMemo(
    () => (assetsQuery.data ?? []) as LabelPreviewAsset[],
    [assetsQuery.data],
  );
  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

  useEffect(() => {
    if (templates.length === 0) {
      return;
    }

    if (
      selectedTemplateId &&
      templates.some((template) => template.id === selectedTemplateId)
    ) {
      return;
    }

    const nextTemplateId =
      requestedTemplateId &&
      templates.some((template) => template.id === requestedTemplateId)
        ? requestedTemplateId
        : (defaultTemplate?.id ?? templates[0]!.id);

    if (nextTemplateId !== selectedTemplateId) {
      setSelectedTemplateId(nextTemplateId);
    }
  }, [
    defaultTemplate?.id,
    requestedTemplateId,
    selectedTemplateId,
    templates,
  ]);

  useEffect(() => {
    if (!selectedTemplate) {
      setBarcodeRenderState("loading");
      return;
    }

    const container = previewRef.current;
    if (!container) {
      setBarcodeRenderState("loading");
      return;
    }

    const syncState = () => {
      setBarcodeRenderState(getBarcodeRenderState(container));
    };

    syncState();
    const frame = window.requestAnimationFrame(syncState);
    const observer = new MutationObserver(syncState);
    observer.observe(container, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-barcode-state"],
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [assets, selectedTemplate]);

  if (
    currentUserPending ||
    templatesQuery.isPending ||
    defaultTemplateQuery.isPending ||
    labelUrlBaseQuery.isPending ||
    fieldDefinitionsQuery.isPending ||
    (assetIds.length > 0 && assetsQuery.isPending)
  ) {
    return (
      <div className="rounded-2xl border border-border/70 bg-background p-6 text-sm text-muted-foreground shadow-sm">
        Loading print preview...
      </div>
    );
  }

  if (assetIds.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-background p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">
          No assets selected
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose one asset from the detail page or select assets from the assets
          list first.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button asChild variant="outline" className="cursor-pointer">
            <Link href="/assets">
              <ArrowLeft className="h-4 w-4" />
              Back to assets
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedTemplate) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-background p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">
          No label template available
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a label template first, then return to print preview.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button asChild className="cursor-pointer">
            <Link href="/labels">Open labels</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-print-page>
      <section
        className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm print:hidden"
        data-print-controls
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Print preview
            </h2>
            <p className="text-sm text-muted-foreground">
              Review the rendered labels, then use your browser print dialog.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="cursor-pointer">
              <Link href="/assets">
                <ArrowLeft className="h-4 w-4" />
                Back to assets
              </Link>
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={barcodeRenderState !== "ready"}
              onClick={() => {
                if (barcodeRenderState === "loading") {
                  toast.error("Wait for the label codes to finish rendering.");
                  return;
                }

                if (barcodeRenderState === "error") {
                  toast.error(
                    "Some label codes failed to render. Resolve that before printing.",
                  );
                  return;
                }

                window.print();
              }}
            >
              <Printer className="h-4 w-4" />
              Print now
            </Button>
          </div>
        </div>

        {barcodeRenderState !== "ready" ? (
          <p className="text-sm text-muted-foreground">
            {barcodeRenderState === "loading"
              ? "Preparing barcode and Data Matrix output before printing."
              : "Barcode or Data Matrix rendering failed. Printing is blocked until the preview is valid."}
          </p>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,280px)_1fr_1fr]">
          <div className="space-y-1.5">
            <label
              htmlFor="label-print-template"
              className="text-sm font-medium"
            >
              Template
            </label>
            <Select
              value={selectedTemplate.id}
              onValueChange={(value) => setSelectedTemplateId(value)}
            >
              <SelectTrigger id="label-print-template" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Dimensions
            </p>
            <p className="mt-1 text-sm font-medium">
              {formatLabelDimensions(
                selectedTemplate.widthMm,
                selectedTemplate.heightMm,
              )}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Labels
            </p>
            <p className="mt-1 text-sm font-medium">
              {assets.length} {assets.length === 1 ? "asset" : "assets"}
            </p>
          </div>
        </div>
      </section>

      <div ref={previewRef}>
        <LabelPrint
          template={selectedTemplate}
          assets={assets}
          fieldDefinitions={fieldDefinitions}
          origin={labelUrlBase ?? undefined}
        />
      </div>
    </div>
  );
}
