"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AssetDetail } from "@/components/assets/asset-detail";
import { getAssetUiErrorMessage } from "@/components/assets/error-messages";
import type {
  AssetDetail as AssetDetailType,
  AssetStatus,
} from "@/components/assets/types";
import type { FieldDefinition } from "@/components/fields/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  deleteAsset,
  getAsset,
  updateAsset,
  updateAssetStatus,
} from "@/lib/api/assets";
import { listCustomFields } from "@/lib/api/custom-fields";

export function AssetDetailPageClient({ assetId }: { assetId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentUser, isPending: currentUserPending } = useCurrentUser();

  const assetQuery = useQuery({
    queryKey: ["assets", "detail", assetId],
    queryFn: () => getAsset(assetId),
  });
  const fieldsQuery = useQuery({
    queryKey: ["custom-fields", "list"],
    queryFn: listCustomFields,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: AssetStatus) => updateAssetStatus(assetId, status),
    onSuccess: () => {
      toast.success("Asset status updated");
      void queryClient.invalidateQueries({
        queryKey: ["assets", "detail", assetId],
      });
      void queryClient.invalidateQueries({ queryKey: ["assets", "list"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      toast.error(getAssetUiErrorMessage(error, "Unable to update status"));
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: (locationId: string | null) =>
      updateAsset(assetId, { locationId }),
    onSuccess: () => {
      toast.success("Location updated");
      void queryClient.invalidateQueries({
        queryKey: ["assets", "detail", assetId],
      });
      void queryClient.invalidateQueries({ queryKey: ["assets", "list"] });
      void queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
    onError: (error) => {
      toast.error(getAssetUiErrorMessage(error, "Unable to move asset"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAsset(assetId),
    onSuccess: () => {
      toast.success("Asset deleted");
      void queryClient.invalidateQueries({ queryKey: ["assets", "list"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["service-schedules"] });
      router.push("/assets");
    },
    onError: (error) => {
      toast.error(getAssetUiErrorMessage(error, "Unable to delete asset"));
    },
  });

  const loading =
    currentUserPending || assetQuery.isPending || fieldsQuery.isPending;

  const detail = (assetQuery.data ?? null) as AssetDetailType | null;
  const customFieldDefinitions = useMemo(
    () => (fieldsQuery.data ?? []) as unknown as FieldDefinition[],
    [fieldsQuery.data],
  );

  async function handleStatusChange(status: AssetStatus) {
    if (!detail || detail.status === status) {
      return;
    }
    await updateStatusMutation.mutateAsync(status);
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync();
  }

  if (loading) {
    return (
      <div aria-busy="true">
        <span className="sr-only">Loading asset...</span>
        <div className="mb-7 grid grid-cols-[minmax(0,1fr)_88px] gap-x-3 rule-ink pb-6 md:grid-cols-[112px_minmax(0,1fr)] md:gap-x-6 lg:grid-cols-[144px_minmax(0,1fr)]">
          <div className="dash-slot col-start-2 row-start-1 size-[88px] md:col-start-1 md:size-28 lg:h-32 lg:w-36" />
          <div className="col-start-1 row-start-1 space-y-4 pt-1 md:col-start-2">
            <span className="block h-[34px] w-24 rounded-xs border-2 border-line-2 max-md:hidden" />
            <Skeleton className="h-5 w-2/3 max-w-md" />
            <Skeleton className="h-2.5 w-1/3 max-w-60" />
          </div>
        </div>
        <Skeleton className="h-40 rounded-md md:w-[calc(100%-324px)] lg:w-[calc(100%-368px)]" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="max-w-xl py-6">
        <h1 className="wide text-2xl font-bold text-foreground">Asset not found</h1>
        <p className="mt-1.5 text-[15px] text-ink-2">
          It may have been deleted, or the link is wrong. Search for it, or go
          back to the list.
        </p>
        <Button asChild className="mt-5" variant="outline">
          <Link href="/assets">Back to assets</Link>
        </Button>
      </div>
    );
  }

  return (
    <AssetDetail
      asset={detail}
      fieldDefinitions={customFieldDefinitions}
      canDelete={currentUser?.role === "admin"}
      deleting={deleteMutation.isPending}
      updatingStatus={updateStatusMutation.isPending}
      updatingLocation={updateLocationMutation.isPending}
      onStatusChange={handleStatusChange}
      onLocationChange={(locationId) => {
        if (locationId !== detail.locationId) {
          updateLocationMutation.mutate(locationId);
        }
      }}
      onDelete={handleDelete}
    />
  );
}
