"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ServiceGroupAssetsPanel } from "@/components/services/service-group-assets-panel";
import { ServiceGroupEditor } from "@/components/services/service-group-editor";
import { ServiceGroupFieldsPanel } from "@/components/services/service-group-fields-panel";
import { ServicesNavTabs } from "@/components/services/services-nav-tabs";
import { Button } from "@/components/ui/button";
import type { Id } from "@/lib/convex-api";
import { api } from "@/lib/convex-api";
import { getConvexUiErrorMessage } from "@/components/crud/error-messages";
import { getConvexErrorCode } from "@/lib/convex-errors";

function mapGroupError(error: unknown, fallback: string) {
  const code = getConvexErrorCode(error);
  if (code === "FORBIDDEN") {
    return "Only admins can manage service groups.";
  }
  return getConvexUiErrorMessage(error, fallback);
}

export function ServiceGroupDetailPageClient({
  groupId,
}: {
  groupId: Id<"serviceGroups">;
}) {
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const group = useQuery(api.serviceGroups.getGroup, { groupId });
  const updateGroup = useMutation(api.serviceGroups.updateGroup);

  const canManage = currentUser?.role === "admin";
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (group === undefined || currentUser === undefined) {
    return (
      <div className="rounded-xl border border-border/70 bg-background p-6 text-sm text-muted-foreground shadow-sm">
        Loading group...
      </div>
    );
  }

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
    setSaving(true);
    try {
      await updateGroup({
        groupId,
        name: values.name,
        description: values.description.trim() ? values.description : null,
      });
      toast.success("Service group updated");
      setEditorOpen(false);
    } catch (error) {
      toast.error(mapGroupError(error, "Unable to update service group"));
    } finally {
      setSaving(false);
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
        submitting={saving}
        onClose={() => setEditorOpen(false)}
        onSubmit={handleSave}
      />
    </div>
  );
}
