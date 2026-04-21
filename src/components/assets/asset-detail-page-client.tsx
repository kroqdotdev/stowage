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
import { useCurrentUser } from "@/hooks/use-current-user";
import { deleteAsset, getAsset, updateAssetStatus } from "@/lib/api/assets";
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
      <div className="rounded-xl border border-border/70 bg-background p-6 text-sm text-muted-foreground shadow-sm">
        Loading asset...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-xl border border-border/70 bg-background p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">
          Asset not found
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The requested asset could not be found.
        </p>
        <Button asChild className="mt-4 cursor-pointer" variant="outline">
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
      onStatusChange={handleStatusChange}
      onDelete={handleDelete}
    />
  );
}
