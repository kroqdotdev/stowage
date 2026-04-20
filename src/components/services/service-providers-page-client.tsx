"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { getConvexUiErrorMessage } from "@/components/crud/error-messages";
import { CrudModal } from "@/components/crud/modal";
import { ServicesNavTabs } from "@/components/services/services-nav-tabs";
import type { ServiceProvider } from "@/components/services/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  createServiceProvider,
  deleteServiceProvider,
  listServiceProviders,
  updateServiceProvider,
} from "@/lib/api/service-providers";

type ProviderFormState = {
  name: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
};

function createInitialForm(
  provider?: ServiceProvider | null,
): ProviderFormState {
  return {
    name: provider?.name ?? "",
    contactEmail: provider?.contactEmail ?? "",
    contactPhone: provider?.contactPhone ?? "",
    notes: provider?.notes ?? "",
  };
}

export function ServiceProvidersPageClient() {
  const queryClient = useQueryClient();
  const { data: currentUser, isPending: currentUserPending } = useCurrentUser();
  const providersQuery = useQuery({
    queryKey: ["service-providers"],
    queryFn: listServiceProviders,
  });

  const createMutation = useMutation({ mutationFn: createServiceProvider });
  const updateMutation = useMutation({
    mutationFn: ({
      providerId,
      input,
    }: {
      providerId: string;
      input: Parameters<typeof updateServiceProvider>[1];
    }) => updateServiceProvider(providerId, input),
  });
  const deleteMutation = useMutation({ mutationFn: deleteServiceProvider });

  const [editingProvider, setEditingProvider] =
    useState<ServiceProvider | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteProviderId, setDeleteProviderId] = useState<string | null>(null);
  const [form, setForm] = useState<ProviderFormState>(createInitialForm());

  const providers = useMemo(
    () => (providersQuery.data ?? []) as ServiceProvider[],
    [providersQuery.data],
  );
  const canManage = currentUser?.role === "admin";

  function openCreate() {
    setEditingProvider(null);
    setForm(createInitialForm());
    setModalOpen(true);
  }

  function openEdit(provider: ServiceProvider) {
    setEditingProvider(provider);
    setForm(createInitialForm(provider));
    setModalOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (editingProvider) {
        await updateMutation.mutateAsync({
          providerId: editingProvider.id,
          input: form,
        });
        toast.success("Service provider updated");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Service provider created");
      }
      setModalOpen(false);
      setEditingProvider(null);
      setForm(createInitialForm());
      void queryClient.invalidateQueries({ queryKey: ["service-providers"] });
    } catch (error) {
      toast.error(
        getConvexUiErrorMessage(error, "Unable to save service provider"),
      );
    }
  }

  async function handleDelete() {
    if (!deleteProviderId) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(deleteProviderId);
      toast.success("Service provider deleted");
      setDeleteProviderId(null);
      void queryClient.invalidateQueries({ queryKey: ["service-providers"] });
    } catch (error) {
      toast.error(
        getConvexUiErrorMessage(error, "Unable to delete service provider"),
      );
    }
  }

  const submitting = createMutation.isPending || updateMutation.isPending;

  if (currentUserPending || providersQuery.isPending) {
    return (
      <div className="space-y-4">
        <ServicesNavTabs />
        <div className="rounded-xl border border-border/70 bg-background p-6 text-sm text-muted-foreground shadow-sm">
          Loading service providers...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <ServicesNavTabs />
        {canManage ? (
          <Button type="button" className="cursor-pointer" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add provider
          </Button>
        ) : null}
      </div>

      {providers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-5 text-sm text-muted-foreground">
          No service providers yet.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {providers.map((provider) => (
            <article
              key={provider.id}
              className="rounded-xl border border-border/70 bg-background p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold tracking-tight">
                    {provider.name}
                  </h3>
                  {provider.contactEmail ? (
                    <p className="text-sm text-muted-foreground">
                      {provider.contactEmail}
                    </p>
                  ) : null}
                  {provider.contactPhone ? (
                    <p className="text-sm text-muted-foreground">
                      {provider.contactPhone}
                    </p>
                  ) : null}
                </div>

                {canManage ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => openEdit(provider)}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => setDeleteProviderId(provider.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                ) : null}
              </div>

              {provider.notes ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {provider.notes}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <CrudModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProvider ? "Edit provider" : "Add provider"}
        description="Manage service providers used in lifecycle records."
      >
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label
              htmlFor="service-provider-name"
              className="text-sm font-medium"
            >
              Name
            </label>
            <Input
              id="service-provider-name"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              disabled={submitting}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="service-provider-email"
              className="text-sm font-medium"
            >
              Contact email
            </label>
            <Input
              id="service-provider-email"
              type="email"
              value={form.contactEmail}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  contactEmail: event.target.value,
                }))
              }
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="service-provider-phone"
              className="text-sm font-medium"
            >
              Contact phone
            </label>
            <Input
              id="service-provider-phone"
              value={form.contactPhone}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  contactPhone: event.target.value,
                }))
              }
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="service-provider-notes"
              className="text-sm font-medium"
            >
              Notes
            </label>
            <Textarea
              id="service-provider-notes"
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              disabled={submitting}
              className="min-h-24"
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              className="cursor-pointer"
              disabled={submitting}
            >
              {editingProvider ? "Save provider" : "Create provider"}
            </Button>
          </div>
        </form>
      </CrudModal>

      <ConfirmDialog
        open={deleteProviderId !== null}
        title="Delete provider"
        description="Delete this service provider?"
        confirmLabel="Delete provider"
        busy={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteProviderId(null)}
      />
    </div>
  );
}
