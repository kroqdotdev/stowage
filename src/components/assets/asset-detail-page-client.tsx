"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { AssetDetail } from "@/components/assets/asset-detail";
import { getAssetUiErrorMessage } from "@/components/assets/error-messages";
import type {
  AssetDetail as AssetDetailType,
  AssetStatus,
} from "@/components/assets/types";
import type { FieldDefinition } from "@/components/fields/types";
import { Button } from "@/components/ui/button";
import type { Id } from "@/lib/convex-api";
import { api } from "@/lib/convex-api";

export function AssetDetailPageClient({ assetId }: { assetId: Id<"assets"> }) {
  const router = useRouter();

  const currentUser = useQuery(api.users.getCurrentUser, {});
  const asset = useQuery(api.assets.getAsset, { assetId });
  const fieldDefinitions = useQuery(api.customFields.listFieldDefinitions, {});

  const updateAssetStatus = useMutation(api.assets.updateAssetStatus);
  const deleteAsset = useMutation(api.assets.deleteAsset);

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loading =
    currentUser === undefined ||
    asset === undefined ||
    fieldDefinitions === undefined;

  const detail = (asset ?? null) as AssetDetailType | null;
  const customFieldDefinitions = useMemo(
    () => (fieldDefinitions ?? []) as unknown as FieldDefinition[],
    [fieldDefinitions],
  );

  async function handleStatusChange(status: AssetStatus) {
    if (!detail || detail.status === status) {
      return;
    }

    setUpdatingStatus(true);
    try {
      await updateAssetStatus({ assetId, status });
      toast.success("Asset status updated");
    } catch (error) {
      toast.error(getAssetUiErrorMessage(error, "Unable to update status"));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAsset({ assetId });
      toast.success("Asset deleted");
      router.push("/assets");
    } catch (error) {
      toast.error(getAssetUiErrorMessage(error, "Unable to delete asset"));
    } finally {
      setDeleting(false);
    }
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
      deleting={deleting}
      updatingStatus={updatingStatus}
      onStatusChange={handleStatusChange}
      onDelete={handleDelete}
    />
  );
}
