"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import type { FieldDefinition } from "@/components/fields/types";
import { MM_TO_PX } from "@/components/labels/helpers";
import { LabelPreview } from "@/components/labels/label-preview";
import type { LabelPreviewAsset, LabelTemplate } from "@/components/labels/types";
import { Button } from "@/components/ui/button";
import { Panel, PanelFooter } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ensureDefaultLabelTemplates,
  getDefaultLabelTemplate,
  getLabelUrlBase,
} from "@/lib/api/label-templates";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/*
  The label card: the default template drawn with this asset's data on a
  quiet well, scaled to fit (never up), then Print label in the footer.
*/
export function AssetLabelPanel({
  asset,
  fieldDefinitions,
  className,
}: {
  asset: LabelPreviewAsset;
  fieldDefinitions: FieldDefinition[];
  className?: string;
}) {
  const [wellRef, wellWidth] = useElementWidth<HTMLDivElement>();
  const templateQuery = useQuery({
    queryKey: ["label-templates", "default"],
    queryFn: getDefaultLabelTemplate,
  });
  const urlBaseQuery = useQuery({
    queryKey: ["label-templates", "url-base"],
    queryFn: getLabelUrlBase,
  });

  const template = (templateQuery.data ?? null) as LabelTemplate | null;

  // Same as the print page: a fresh install gets the built-in templates the
  // first time a label is shown.
  const queryClient = useQueryClient();
  const ensureMutation = useMutation({
    mutationFn: ensureDefaultLabelTemplates,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["label-templates"] });
    },
  });
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";
  const seededRef = useRef(false);
  useEffect(() => {
    if (!isAdmin || seededRef.current || templateQuery.isPending || templateQuery.data) return;
    seededRef.current = true;
    ensureMutation.mutate();
  }, [isAdmin, templateQuery.isPending, templateQuery.data, ensureMutation]);
  const labelPx = template ? template.widthMm * MM_TO_PX : 0;
  const scale = template && wellWidth > 0 ? Math.min(1, wellWidth / labelPx) : 0;

  return (
    <Panel className={className} data-testid="asset-label-panel">
      <div className="flex items-center justify-between gap-3 px-[18px] pt-4 pb-3">
        <span className="eyebrow whitespace-nowrap">
          Label
          {template ? (
            <>
              {" · "}
              {template.widthMm} × {template.heightMm}{" "}
              <span className="normal-case">mm</span>
            </>
          ) : null}
        </span>
        <Link
          href="/labels"
          className="text-sm font-medium whitespace-nowrap text-ink-2 underline underline-offset-[3px] hover:text-foreground"
        >
          Change template…
        </Link>
      </div>

      <div className="mx-[18px] rounded-xs bg-secondary p-4">
        <div ref={wellRef} className="flex min-h-16 justify-center">
          {templateQuery.isPending || ensureMutation.isPending ? (
            <Skeleton className="h-16 w-full rounded-xs" />
          ) : !template ? (
            <p className="self-center text-sm text-ink-2">
              No label template yet.{" "}
              <Link href="/labels" className="font-medium text-foreground underline underline-offset-[3px]">
                Set one up…
              </Link>
            </p>
          ) : scale > 0 ? (
            <div
              role="img"
              aria-label={`Label preview, ${asset.assetTag}, ${template.widthMm} by ${template.heightMm} mm`}
            >
              <LabelPreview
                template={template}
                asset={asset}
                fieldDefinitions={fieldDefinitions}
                origin={urlBaseQuery.data ?? undefined}
                scale={scale}
                surfaceClassName="rounded-[1mm] border-line-2 shadow-[2px_2px_0_rgba(27,29,26,.12)]"
              />
            </div>
          ) : null}
        </div>
      </div>
      {template && scale > 0 && scale < 1 ? (
        <p className="px-[18px] pt-2 text-[13px] text-muted-foreground">Scaled to fit</p>
      ) : null}

      <PanelFooter className={cn("mt-3.5 justify-end py-3.5")}>
        <Button asChild variant="outline" className="max-md:w-full">
          <Link href={`/labels/print?assetId=${asset.id}`}>
            <Printer />
            Print label
          </Link>
        </Button>
      </PanelFooter>
    </Panel>
  );
}
