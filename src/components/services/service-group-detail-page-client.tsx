"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ServiceGroupAssetsPanel } from "@/components/services/service-group-assets-panel";
import { ServiceGroupEditor } from "@/components/services/service-group-editor";
import { ServiceGroupFieldsPanel } from "@/components/services/service-group-fields-panel";
import { ServicesNavTabs } from "@/components/services/services-nav-tabs";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getApiErrorMessage } from "@/components/crud/error-messages";
import { ApiRequestError } from "@/lib/api-client";
import {
  getServiceGroup,
  updateServiceGroup,
} from "@/lib/api/service-groups";

function mapGroupError(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    if (error.status === 403) {
      return "Only admins can manage service groups.";
    }
    return error.message || fallback;
  }
  return getApiErrorMessage(error, fallback);
}

export function ServiceGroupDetailPageClient({
  groupId,
}: {
  groupId: string;
}) {
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
      <div className="rounded-xl border border-border/70 bg-background p-6 text-sm text-muted-foreground shadow-sm">
        Loading group...
      </div>
    );
  }

  const group = groupQuery.data ?? null;

  if (!group) {
    return (
      <div className="space-y-4">
        <ServicesNavTabs />
        <div className="rounded-xl border border-border/70 bg-background p-6 shadow-sm">
          <h2 className="text-base font-semibold tracking-tight">
            Group not found
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The selected service group no longer exists.
          </p>
          <Button asChild variant="outline" className="mt-4 cursor-pointer">
            <Link href="/services/groups">Back to groups</Link>
          </Button>
        </div>
      </div>
    );
  }

  async function handleSave(values: { name: string; description: string }) {
    try {
      await updateMutation.mutateAsync({
        name: values.name,
        description: values.description.trim() ? values.description : null,
      });
      toast.success("Service group updated");
      setEditorOpen(false);
      void queryClient.invalidateQueries({
        queryKey: ["service-groups", groupId],
      });
      void queryClient.invalidateQueries({ queryKey: ["service-groups"] });
    } catch (error) {
      toast.error(mapGroupError(error, "Unable to update service group"));
    }
  }

  return (
    <div className="space-y-4">
      <ServicesNavTabs />

      <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              {group.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {group.description ?? "No description provided."}
            </p>
          </div>
          {canManage ? (
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setEditorOpen(true)}
            >
              Edit group
            </Button>
          ) : null}
        </div>
      </section>

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
