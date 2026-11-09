"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { getApiErrorMessage } from "@/components/crud/error-messages";
import { CrudModal } from "@/components/crud/modal";
import type { ServiceProvider } from "@/components/services/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SheetHeading } from "@/components/ui/sheet-heading";
import { Skeleton } from "@/components/ui/skeleton";
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
      toast.error(getApiErrorMessage(error, "Unable to save service provider"));
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
        getApiErrorMessage(error, "Unable to delete service provider"),
      );
    }
  }

  const submitting = createMutation.isPending || updateMutation.isPending;

  const loading = currentUserPending || providersQuery.isPending;

  return (
    <div>
      <SheetHeading
        title="Providers"
        count={loading ? undefined : providers.length}
        aside={
          canManage ? (
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus />
              New provider…
            </Button>
          ) : null
        }
      />

      {loading ? (
        <div className="space-y-3 py-4" aria-busy="true">
          <span className="sr-only">Loading service providers...</span>
          <Skeleton className="h-2.5 w-1/2" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      ) : providers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No service providers yet."
          description="Add the firms and people who service your assets, then pick them when you log a service."
          action={
            canManage ? (
              <Button type="button" onClick={openCreate}>
                <Plus />
                New provider…
              </Button>
            ) : null
          }
        />
      ) : (
        <ul>
          {providers.map((provider) => (
            <li
              key={provider.id}
              className="flex items-start gap-3 border-b border-border px-0.5 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold text-foreground">{provider.name}</h3>
                {provider.contactEmail || provider.contactPhone ? (
                  <p className="mt-0.5 text-sm text-ink-2">
                    {provider.contactEmail ? (
                      <a
                        href={`mailto:${provider.contactEmail}`}
                        className="underline underline-offset-[3px] hover:text-foreground"
                      >
                        {provider.contactEmail}
                      </a>
                    ) : null}
                    {provider.contactEmail && provider.contactPhone ? " · " : null}
                    {provider.contactPhone ? (
                      <a href={`tel:${provider.contactPhone}`} className="whitespace-nowrap hover:text-foreground">
                        {provider.contactPhone}
                      </a>
                    ) : null}
                  </p>
                ) : null}
                {provider.notes ? (
                  <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">{provider.notes}</p>
                ) : null}
              </div>

              {canManage ? (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(provider)}
                  >
                    <Pencil />
                    Edit…
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${provider.name}`}
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteProviderId(provider.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <CrudModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProvider ? "Edit provider" : "New provider"}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label
              htmlFor="service-provider-name"
              className="text-sm font-semibold"
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
              className="text-sm font-semibold"
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
              className="text-sm font-semibold"
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
              className="text-sm font-semibold"
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
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {editingProvider ? "Save provider" : "Create provider"}
            </Button>
          </div>
        </form>
      </CrudModal>

      <ConfirmDialog
        open={deleteProviderId !== null}
        title="Delete provider?"
        description="The provider is deleted. A provider named on a service record cannot be deleted."
        confirmLabel="Delete provider"
        busy={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteProviderId(null)}
      />
    </div>
  );
}
