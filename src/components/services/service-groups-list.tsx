"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { getConvexUiErrorMessage } from "@/components/crud/error-messages";
import { ServiceGroupEditor } from "@/components/services/service-group-editor";
import type { ServiceGroupSummary } from "@/components/services/types";
import { ServicesNavTabs } from "@/components/services/services-nav-tabs";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ApiRequestError } from "@/lib/api-client";
import {
  createServiceGroup,
  deleteServiceGroup,
  listServiceGroups,
  updateServiceGroup,
} from "@/lib/api/service-groups";

function mapGroupError(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    if (error.status === 403) {
      return "Only admins can manage service groups.";
    }
    if (error.status === 409) {
      return "This service group is in use and cannot be deleted.";
    }
    return error.message || fallback;
  }
  return getConvexUiErrorMessage(error, fallback);
}

export function ServiceGroupsList() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const groupsQuery = useQuery({
    queryKey: ["service-groups"],
    queryFn: listServiceGroups,
  });

  const createMutation = useMutation({
    mutationFn: createServiceGroup,
  });
  const updateMutation = useMutation({
    mutationFn: ({
      groupId,
      input,
    }: {
      groupId: string;
      input: { name: string; description?: string | null };
    }) => updateServiceGroup(groupId, input),
  });
  const deleteMutation = useMutation({
    mutationFn: (groupId: string) => deleteServiceGroup(groupId),
  });

  const canManage = currentUser?.role === "admin";
  const rows = useMemo(
    () => (groupsQuery.data ?? []) as ServiceGroupSummary[],
    [groupsQuery.data],
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [activeGroup, setActiveGroup] = useState<{
    id: string;
    name: string;
    description: string | null;
  } | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

  const activeDeleteGroup =
    deleteGroupId === null
      ? null
      : (rows.find((row) => row.id === deleteGroupId) ?? null);

  async function handleSave(values: { name: string; description: string }) {
    try {
      if (editorMode === "create") {
        await createMutation.mutateAsync({
          name: values.name,
          description: values.description.trim() ? values.description : null,
        });
        toast.success("Service group created");
      } else if (activeGroup) {
        await updateMutation.mutateAsync({
          groupId: activeGroup.id,
          input: {
            name: values.name,
            description: values.description.trim() ? values.description : null,
          },
        });
        toast.success("Service group updated");
      }
      setEditorOpen(false);
      setActiveGroup(null);
      void queryClient.invalidateQueries({ queryKey: ["service-groups"] });
    } catch (error) {
      toast.error(
        mapGroupError(
          error,
          editorMode === "create"
            ? "Unable to create service group"
            : "Unable to update service group",
        ),
      );
    }
  }

  async function handleDelete() {
    if (!deleteGroupId) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(deleteGroupId);
      toast.success("Service group deleted");
      setDeleteGroupId(null);
      void queryClient.invalidateQueries({ queryKey: ["service-groups"] });
    } catch (error) {
      toast.error(mapGroupError(error, "Unable to delete service group"));
    }
  }

  const submitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <ServicesNavTabs />

      <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Service groups
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure reusable service requirements and assign one group per
              asset.
            </p>
          </div>
          {canManage ? (
            <Button
              type="button"
              className="cursor-pointer"
              onClick={() => {
                setEditorMode("create");
                setActiveGroup(null);
                setEditorOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Create group
            </Button>
          ) : null}
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border/60">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Fields</th>
                <th className="px-3 py-2 font-medium">Assets</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupsQuery.isPending ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    Loading service groups...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No service groups yet.
                  </td>
                </tr>
              ) : (
                rows.map((group) => (
                  <tr key={group.id} className="border-t border-border/50">
                    <td className="px-3 py-2 font-medium">
                      <Link
                        href={`/services/groups/${group.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {group.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {group.description ?? "—"}
                    </td>
                    <td className="px-3 py-2">{group.fieldCount}</td>
                    <td className="px-3 py-2">{group.assetCount}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer"
                        >
                          <Link href={`/services/groups/${group.id}`}>
                            Open
                          </Link>
                        </Button>
                        {canManage ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer"
                              onClick={() => {
                                setEditorMode("edit");
                                setActiveGroup(group);
                                setEditorOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="cursor-pointer text-destructive"
                              onClick={() => setDeleteGroupId(group.id)}
                              aria-label={`Delete ${group.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ServiceGroupEditor
        key={`${editorMode}-${activeGroup?.id ?? "new"}-${editorOpen ? "open" : "closed"}`}
        open={editorOpen}
        mode={editorMode}
        initialGroup={activeGroup}
        submitting={submitting}
        onClose={() => {
          setEditorOpen(false);
          setActiveGroup(null);
        }}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={deleteGroupId !== null}
        title="Delete service group"
        description={`Delete ${activeDeleteGroup?.name ?? "this group"}?`}
        confirmLabel="Delete group"
        busy={deleteMutation.isPending}
        onConfirm={() => {
          void handleDelete();
        }}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteGroupId(null);
          }
        }}
      />
    </div>
  );
}
