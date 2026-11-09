"use client";

import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ServiceGroupAssetsPanel } from "@/components/services/service-group-assets-panel";
import { ServiceGroupEditor } from "@/components/services/service-group-editor";
import { ServiceGroupFieldsPanel } from "@/components/services/service-group-fields-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getApiErrorMessage } from "@/components/crud/error-messages";
import { ApiRequestError } from "@/lib/api-client";
import { getServiceGroup, updateServiceGroup } from "@/lib/api/service-groups";

function mapGroupError(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    if (error.status === 403) {
      return "Only admins can manage service plans.";
    }
    return error.message || fallback;
  }
  return getApiErrorMessage(error, fallback);
}

export function ServiceGroupDetailPageClient({ groupId }: { groupId: string }) {
  const queryClient = useQueryClient();
  const { data: currentUser, isPending: currentUserPending } = useCurrentUser();
  const groupQuery = useQuery({
    queryKey: ["service-groups", groupId],
    queryFn: () => getServiceGroup(groupId),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { name: string; description?: string | null }) =>
      updateServiceGroup(groupId, input),
  });

  const canManage = currentUser?.role === "admin";
  const [editorOpen, setEditorOpen] = useState(false);

  if (groupQuery.isPending || currentUserPending) {
    return (
      <div className="space-y-4 py-2" aria-busy="true">
        <span className="sr-only">Loading group...</span>
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-2.5 w-80 max-w-full" />
      </div>
    );
  }

  const group = groupQuery.data ?? null;

  if (!group) {
    return (
      <div className="max-w-xl py-4">
        <h2 className="wide text-2xl font-bold text-foreground">Plan not found</h2>
        <p className="mt-1.5 text-[15px] text-ink-2">
          The service plan was deleted, or the link is wrong.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/services/groups">Back to service plans</Link>
        </Button>
      </div>
    );
  }

  async function handleSave(values: { name: string; description: string }) {
    try {
      await updateMutation.mutateAsync({
        name: values.name,
        description: values.description.trim() ? values.description : null,
      });
      toast.success("Service plan updated");
      setEditorOpen(false);
      void queryClient.invalidateQueries({
        queryKey: ["service-groups", groupId],
      });
      void queryClient.invalidateQueries({ queryKey: ["service-groups"] });
    } catch (error) {
      toast.error(mapGroupError(error, "Unable to update service plan"));
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/services/groups"
          className="mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Service plans
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="wide text-2xl leading-tight font-bold text-foreground">
              {group.name}
            </h2>
            <p className="mt-1 max-w-[70ch] text-sm text-ink-2">
              {group.description ?? "No description."}
            </p>
          </div>
          {canManage ? (
            <Button type="button" variant="outline" onClick={() => setEditorOpen(true)}>
              <Pencil />
              Edit…
            </Button>
          ) : null}
        </div>
      </div>

      <ServiceGroupFieldsPanel groupId={groupId} canManage={canManage} />
      <ServiceGroupAssetsPanel groupId={groupId} />

      <ServiceGroupEditor
        open={editorOpen}
        mode="edit"
        initialGroup={group}
        submitting={updateMutation.isPending}
        onClose={() => setEditorOpen(false)}
        onSubmit={handleSave}
      />
    </div>
  );
}
