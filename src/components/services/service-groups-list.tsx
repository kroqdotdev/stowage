"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClipboardList, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { getApiErrorMessage } from "@/components/crud/error-messages";
import { ServiceGroupEditor } from "@/components/services/service-group-editor";
import type { ServiceGroupSummary } from "@/components/services/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { SheetHeading } from "@/components/ui/sheet-heading";
import { Skeleton } from "@/components/ui/skeleton";
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
      return "Only admins can manage service plans.";
    }
    if (error.status === 409) {
      return "This service plan is in use and cannot be deleted.";
    }
    return error.message || fallback;
  }
  return getApiErrorMessage(error, fallback);
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
        toast.success("Service plan created");
      } else if (activeGroup) {
        await updateMutation.mutateAsync({
          groupId: activeGroup.id,
          input: {
            name: values.name,
            description: values.description.trim() ? values.description : null,
          },
        });
        toast.success("Service plan updated");
      }
      setEditorOpen(false);
      setActiveGroup(null);
      void queryClient.invalidateQueries({ queryKey: ["service-groups"] });
    } catch (error) {
      toast.error(
        mapGroupError(
          error,
          editorMode === "create"
            ? "Unable to create service plan"
            : "Unable to update service plan",
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
      toast.success("Service plan deleted");
      setDeleteGroupId(null);
      void queryClient.invalidateQueries({ queryKey: ["service-groups"] });
    } catch (error) {
      toast.error(mapGroupError(error, "Unable to delete service plan"));
    }
  }

  const submitting = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    setEditorMode("create");
    setActiveGroup(null);
    setEditorOpen(true);
  };
  const openEdit = (group: (typeof rows)[number]) => {
    setEditorMode("edit");
    setActiveGroup(group);
    setEditorOpen(true);
  };

  return (
    <div>
      <section>
        <SheetHeading
          title="Service plans"
          count={groupsQuery.isPending ? undefined : rows.length}
          aside={
            canManage ? (
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus />
                New service plan…
              </Button>
            ) : null
          }
        />
        <p className="mt-2 mb-3 max-w-[70ch] text-sm text-ink-2">
          A plan names a kind of service and the fields to fill in when it is
          logged. Each asset follows at most one plan.
        </p>

        {groupsQuery.isPending ? (
          <div className="space-y-3 py-3" aria-busy="true">
            <span className="sr-only">Loading service plans...</span>
            <Skeleton className="h-2.5 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No service plans yet."
            description="Create one, for example “Quarterly inspection”, then assign assets to it."
            action={
              canManage ? (
                <Button type="button" onClick={openCreate}>
                  <Plus />
                  New service plan…
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <ul className="md:hidden" data-testid="service-groups-card-list">
              {rows.map((group) => (
                <li
                  key={group.id}
                  data-testid={`service-group-card-${group.id}`}
                  className="flex items-start gap-3 border-b border-border py-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/services/groups/${group.id}`}
                      className="block truncate text-[15px] font-semibold text-foreground"
                    >
                      {group.name}
                    </Link>
                    {group.description ? (
                      <p className="line-clamp-2 text-sm text-ink-2">{group.description}</p>
                    ) : null}
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {group.fieldCount} field{group.fieldCount === 1 ? "" : "s"} ·{" "}
                      {group.assetCount} asset{group.assetCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  {canManage ? (
                    <GroupActions
                      name={group.name}
                      onEdit={() => openEdit(group)}
                      onDelete={() => setDeleteGroupId(group.id)}
                    />
                  ) : null}
                </li>
              ))}
            </ul>

            <table className="w-full border-collapse text-sm max-md:hidden" data-testid="service-groups-table">
              <thead>
                <tr className="text-left text-[13px]">
                  <th className="h-10 border-b border-border px-0.5 font-semibold">Name</th>
                  <th className="h-10 border-b border-border px-3 font-semibold">Description</th>
                  <th className="h-10 border-b border-border px-3 text-right font-semibold">Fields</th>
                  <th className="h-10 border-b border-border px-3 text-right font-semibold">Assets</th>
                  <th className="h-10 w-11 border-b border-border">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((group) => (
                  <tr key={group.id} className="border-b border-border">
                    <td className="px-0.5 py-3 font-semibold">
                      <Link
                        href={`/services/groups/${group.id}`}
                        className="text-foreground hover:underline hover:underline-offset-[3px]"
                      >
                        {group.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-ink-2">
                      {group.description ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[13px] text-ink-2">{group.fieldCount}</td>
                    <td className="px-3 py-3 text-right font-mono text-[13px] text-ink-2">{group.assetCount}</td>
                    <td className="py-2 pr-0.5 text-right">
                      {canManage ? (
                        <GroupActions
                          name={group.name}
                          onEdit={() => openEdit(group)}
                          onDelete={() => setDeleteGroupId(group.id)}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
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
        title="Delete service plan?"
        description={`${activeDeleteGroup?.name ?? "This plan"} is deleted.`}
        confirmLabel="Delete plan"
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

function GroupActions({
  name,
  onEdit,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil />
          Edit…
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          Delete…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
