"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import type { FieldDefinition } from "@/components/fields/types";
import { formatLabelDimensions } from "@/components/labels/helpers";
import { LabelPrint } from "@/components/labels/label-print";
import type {
  LabelPreviewAsset,
  LabelTemplate,
} from "@/components/labels/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
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
  }, [defaultTemplate?.id, requestedTemplateId, selectedTemplateId, templates]);

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
      <div className="space-y-4">
        <span className="sr-only">Loading print preview...</span>
        <Skeleton className="h-9 w-72 rounded-md" aria-hidden="true" />
        <div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-hidden="true"
        >
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-40 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (assetIds.length === 0) {
    return (
      <EmptyState
        icon={Printer}
        title="No assets selected."
        description="Choose one asset from the detail page or select assets from the assets list first."
        action={
          <Button asChild variant="outline">
            <Link href="/assets">
              <ArrowLeft />
              Back to assets
            </Link>
          </Button>
        }
      />
    );
  }

  if (!selectedTemplate) {
    return (
      <EmptyState
        icon={Printer}
        title="No label template available."
        description="Create a label template first, then return to print preview."
        action={
          <Button asChild>
            <Link href="/labels">Open Labels</Link>
          </Button>
        }
      />
    );
  }

  const printButton = (
    <Button
      type="button"
      className="max-sm:h-11 max-sm:flex-1"
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
      <Printer />
      Print now
    </Button>
  );

  return (
    <div className="space-y-6" data-print-page>
      <section className="space-y-3 print:hidden" data-print-controls>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="w-full space-y-1.5 sm:w-72">
            <label
              htmlFor="label-print-template"
              className="text-sm font-semibold"
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

          <dl className="flex gap-6 pb-1.5 text-sm">
            <div>
              <dt className="eyebrow">Size</dt>
              <dd className="mt-0.5 font-mono font-medium text-foreground">
                {formatLabelDimensions(
                  selectedTemplate.widthMm,
                  selectedTemplate.heightMm,
                )}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Labels</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {assets.length} {assets.length === 1 ? "asset" : "assets"}
              </dd>
            </div>
          </dl>

          <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
            <Button
              asChild
              variant="secondary"
              className="max-sm:h-11 max-sm:flex-1"
            >
              <Link href="/assets">
                <ArrowLeft />
                Back to assets
              </Link>
            </Button>
            {printButton}
          </div>
        </div>

        {barcodeRenderState !== "ready" ? (
          <p
            className={
              barcodeRenderState === "error"
                ? "flex items-start gap-1.5 text-sm font-medium text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {barcodeRenderState === "error" ? (
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
            ) : null}
            {barcodeRenderState === "loading"
              ? "Preparing barcode and Data Matrix output before printing."
              : "Barcode or Data Matrix rendering failed. Printing is blocked until the preview is valid."}
          </p>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            Print now opens your browser’s print dialog, one label per page.
          </p>
        )}
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
